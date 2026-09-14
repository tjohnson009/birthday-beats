import youtubeVideoEntries from "../../data/youtube-videos.json";

type YoutubeVideoInfo = {
    videoId: string;
    title: string;
    channelName: string;
};
type YoutubeVideosManifest = Record<string, YoutubeVideoInfo | null>;

const youtubeVideos = youtubeVideoEntries as YoutubeVideosManifest;

export const lookupYoutubeVideoForSong = (song: string, artist: string): YoutubeVideoInfo | null => {
    const key = `${song}|${artist}`;
    return youtubeVideos[key] ?? null;
};
