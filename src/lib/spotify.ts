import spotifyOverrides from "../../data/spotify-overrides.json" with { type: "json" };

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

export type Song = {
    id: string;
    title: string;
    albumArt: string | null;
    artistList: string[];
    explicit: boolean;
    releaseDate: string;
    albumName: string;
    albumType: string;
    albumTotalTracks: number;
    trackNumber: number;
    duration: number;
    spotifyUrl: string;
};

let token: { value: string; expiresAt: number } | null = null;

if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
}

export const getAccessToken = async () => {
    // check for fresh token
    if (token && Date.now() < token.expiresAt - 60000) {
        return token.value;
    }

    // call spotify API with proper credentials
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "client_credentials",
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify token request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    token = {
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return token.value;
};

// Per-song fixes for searches the rules get wrong: a corrected `artist` or `title` for
// the query, or a `trackId` to skip the search and fetch that exact Spotify track.
type SongOverride = { artist?: string; title?: string; trackId?: string; reason?: string };
const overrides = spotifyOverrides as Record<string, SongOverride>;

type SpotifyTrack = {
    id: string;
    name: string;
    explicit: boolean;
    track_number: number;
    duration_ms: number;
    artists: { name: string }[];
    album: { name: string; album_type: string; release_date: string; total_tracks: number; images: { url: string }[] };
    external_urls: { spotify: string };
};

const toSong = (track: SpotifyTrack): Song => {
    return {
        id: track.id,
        title: track.name,
        artistList: track.artists.map((artist: { name: string }) => artist.name),
        explicit: track.explicit,
        releaseDate: track.album.release_date,
        albumName: track.album.name,
        albumArt: track.album.images[0]?.url ?? null,
        albumType: track.album.album_type,
        albumTotalTracks: track.album.total_tracks,
        trackNumber: track.track_number,
        duration: track.duration_ms,
        spotifyUrl: track.external_urls.spotify,
    };
};

export const searchSong = async (title: string, artist: string): Promise<Song | null> => {
    const accessToken = await getAccessToken();
    const override = overrides[`${title}|${artist}`];
    if (override?.trackId) {
        const pinned = await fetch(`https://api.spotify.com/v1/tracks/${override.trackId}?market=US`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (pinned.ok) return toSong(await pinned.json());
    }
    const aliasedArtist = override?.artist ?? artist;
    const normalizedTitle = (override?.title ?? title).replace(/\(\s*(from|theme)\b[^)]*\)/gi, "").split("/")[0].trim();
    const leadArtist = aliasedArtist
        .replace(/\(\s*(featuring|feat\.?)\b[^)]*\)/gi, "")
        .replace(/\s+(featuring|feat\.?|duet with|with|starring)\s+.*$/i, "")
        .trim();
    const query = `track:${normalizedTitle} artist:${leadArtist}`;

    const params = new URLSearchParams({
        q: query,
        type: `track`,
        market: `US`,
        limit: `5`,
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    // of the top 5 matches, prefer the one that is the original version of the
    // song: named exactly what Billboard says, and not on a compilation (those
    // carry reissue/"greatest hits" cover art). If none qualifies, fall back to
    // Spotify's top match — never worse than taking the first result.
    const normalize = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
    const wantedName = normalize(normalizedTitle);
    const isOriginalVersion = (candidate: { name: string; album: { album_type: string } }) =>
        candidate.album.album_type !== "compilation" && normalize(candidate.name) === wantedName;
    const originals = data.tracks.items.filter(isOriginalVersion);
    // karaoke/cover tracks quote the original in their name and album, so the
    // artist: filter matches them — never settle for one as the "top match"
    const notKaraoke = (c: { name: string; album: { name: string } }) =>
        !/karaoke|backing version|made popular by|originally performed|in the style of|tribute/i.test(c.name + " " + c.album.name);
    let track = originals.find((candidate: { album: { album_type: string } }) => candidate.album.album_type === "album")
        ?? originals[0]
        ?? data.tracks.items.find(notKaraoke);

    // Billboard's parenthetical subtitles are often not in Spotify's title
    // ("Bodak Yellow (Money Moves)" is just "Bodak Yellow"), and track: needs
    // every word — so retry once without them before going free-text.
    const bareTitle = normalizedTitle.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    if (!track && bareTitle !== normalizedTitle) {
        params.set("q", `track:${bareTitle} artist:${leadArtist}`);
        const retryResponse = await fetch(`https://api.spotify.com/v1/search?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (retryResponse.ok) {
            const retryItems = (await retryResponse.json()).tracks.items;
            const retryWanted = normalize(bareTitle);
            track = retryItems.find((c: { name: string }) => normalize(c.name) === retryWanted) ?? retryItems.find(notKaraoke);
        }
    }

    if (!track) {
        const fallbackParams = new URLSearchParams({
            q: `${normalizedTitle} ${artist}`,
            type: `track`,
            market: `US`,
            limit: `5`,
        });

        const fallbackResponse = await fetch(`https://api.spotify.com/v1/search?${fallbackParams}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            // free text also matches karaoke/cover tracks that quote the original
            // in their name — only accept one the Billboard artist performs on
            // (either name containing the other, so "Roy Orbison And The Candy Men"
            // still accepts Spotify's plain "Roy Orbison")
            track = fallbackData.tracks.items.find((c: { artists: { name: string }[] }) =>
                c.artists.some((a) => normalize(leadArtist).includes(normalize(a.name)) || normalize(a.name).includes(normalize(leadArtist))),
            );
        }
    }

    if (!track) return null;

    return toSong(track);
};
