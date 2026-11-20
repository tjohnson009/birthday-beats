import fs from "node:fs";

// gives the live site's Spotify cache a head start before a traffic spike. it asks the live site itself,
// so the site's Spotify guard counts every lookup and this can never push past its budget.
// songs come in order of how many 17th birthdays (1977 to now) they cover. stop it with ctrl+c at any time
// usage: npm run prefill:cache [base url]

type NumberOneEntry = {
    date: string;
    song: string;
    artist: string;
};

type SongResponse = {
    spotify: unknown;
    spotifyStatus: string;
};

const BASE_URL = process.argv[2] ?? "https://birthday-beats.vercel.app";
const FIRST_WEEK = "1977-01-01"; // trend posts mostly come from people now in their 30s to 60s, and younger
const LOOKUP_GAP_MS = 90_000; // about 40 Spotify lookups an hour, inside the site budget

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const numberOnes: NumberOneEntry[] = JSON.parse(fs.readFileSync("data/number-ones.json", "utf-8"));

const songs = new Map<string, { week: string; title: string; artist: string; weeks: number }>();
for (const entry of numberOnes) {
    if (entry.date < FIRST_WEEK) continue;
    const key = `${entry.song}|${entry.artist}`;
    const song = songs.get(key);
    if (song) song.weeks++;
    else songs.set(key, { week: entry.date, title: entry.song, artist: entry.artist, weeks: 1 });
}
const queue = [...songs.values()].sort((a, b) => b.weeks - a.weeks);

// source=strip keeps these lookups out of the visit stats
const getSong = async (week: string, peek: boolean): Promise<SongResponse> => {
    const response = await fetch(`${BASE_URL}/api/song?date=${week}&source=strip${peek ? "&mode=peek" : ""}`);
    if (!response.ok) throw new Error(`${response.status}`);
    return response.json();
};

const counts: Record<string, number> = {};
console.log(`${queue.length} songs, ${BASE_URL}`);

for (let i = 0; i < queue.length; i++) {
    const { week, title, artist } = queue[i];
    const label = `[${i + 1}/${queue.length}] ${title} - ${artist}`;

    try {
        const peeked = await getSong(week, true);
        if (peeked.spotify || peeked.spotifyStatus !== "not-cached") {
            console.log(`${label}: already saved`);
            counts.saved = (counts.saved ?? 0) + 1;
            continue;
        }

        const { spotifyStatus } = await getSong(week, false);
        console.log(`${label}: ${spotifyStatus}`);
        counts[spotifyStatus] = (counts[spotifyStatus] ?? 0) + 1;

        // the budget is shared with real visitors, so stop rather than compete with them for it; and if Spotify
        // itself is failing, more calls won't help
        if (spotifyStatus === "limited" || spotifyStatus === "unavailable") {
            console.log(`${spotifyStatus}: stopping so visitors keep the budget. run it again later to continue`);
            break;
        }
    } catch (error) {
        console.log(`${label}: request failed (${error instanceof Error ? error.message : error})`);
        counts.failed = (counts.failed ?? 0) + 1;
    }

    await sleep(LOOKUP_GAP_MS);
}

console.log("done", counts);
