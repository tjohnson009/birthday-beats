import fs from "node:fs"; 

const youtubeApiKey = process.env.YOUTUBE_API_KEY; 

if (!youtubeApiKey) {
    throw new Error("Missing YouTube API key.");
}

type YoutubeVideoInfo = {
    videoId: string,
    title: string, 
    channelName: string, 
}

type YoutubeVideosManifest = Record<string, YoutubeVideoInfo | null>;

class QuotaError extends Error {}

export const getYoutubeVideoInfo = async (title: string, artist: string) => {
    const searchParams = new URLSearchParams({
        part: "snippet", 
        type: "video", 
        maxResults: "1",
        key: youtubeApiKey, 
        q: `${title.replace(/\(.*?\)/g, "").trim()} ${artist} official music video`,
        videoCategoryId: "10", 
        videoEmbeddable: "true"
    }); 

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);

    if (response.status === 403 || response.status === 429) {
        throw new QuotaError(`YouTube search quota reached (${response.status}): ${await response.text()}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch Youtube music video for ${title} by ${artist}: ${response.status} ${await response.text()}`);
    }

    const data = await response.json(); 

    if (!data.items[0]) {
        return null
    }

    return {
        videoId: data.items[0].id.videoId, 
        title: data.items[0].snippet.title, 
        channelName: data.items[0].snippet.channelTitle
    } as YoutubeVideoInfo; 
}

let videosManifest = {} as YoutubeVideosManifest;  
if (fs.existsSync("data/youtube-videos.json")) {
    videosManifest = JSON.parse(fs.readFileSync("data/youtube-videos.json", "utf-8")); 
}

const numberOnes = JSON.parse(fs.readFileSync("data/number-ones.json", "utf-8")); 

const pivot = new Date("1993-01-01").getTime(); 
const sortedNumberOnes = numberOnes.sort((a, b) => {
    return Math.abs(pivot - (new Date(a.date).getTime())) - Math.abs(pivot - (new Date(b.date).getTime())); 
})

let count = 0;
let noMatchCount = 0;
for (let numberOneSong of sortedNumberOnes) {
    if (`${numberOneSong.song}|${numberOneSong.artist}` in videosManifest) {
        continue
    } else {
        let youtubeVideoInfo: YoutubeVideoInfo | null;
        try {
            youtubeVideoInfo = await getYoutubeVideoInfo(numberOneSong.song, numberOneSong.artist);
        } catch (error) {
            if (error instanceof QuotaError) {
                console.log("Daily YouTube search quota reached — stopping for today.");
                break;
            }
            throw error;
        }
        videosManifest[`${numberOneSong.song}|${numberOneSong.artist}`] = youtubeVideoInfo;
        fs.writeFileSync("data/youtube-videos.json", JSON.stringify(videosManifest, null, 2));
        count++

        if (youtubeVideoInfo) {
            console.log(`[${count}] ${numberOneSong.song} — ${numberOneSong.artist} → ${youtubeVideoInfo.videoId} (${youtubeVideoInfo.title} / ${youtubeVideoInfo.channelName})`);
        } else {
            noMatchCount++;
            console.log(`[${count}] ${numberOneSong.song} — ${numberOneSong.artist} → NO MATCH`);
        }
    }
}

const totalSongs = new Set(sortedNumberOnes.map((s: { song: string, artist: string }) => `${s.song}|${s.artist}`)).size;
console.log(`Searched ${count} songs (${noMatchCount} no match). Manifest now covers ${Object.keys(videosManifest).length} of ${totalSongs} songs.`);