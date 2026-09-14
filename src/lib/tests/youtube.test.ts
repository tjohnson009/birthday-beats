import { lookupYoutubeVideoForSong } from "../youtube";
import youtubeVideoEntries from "../../../data/youtube-videos.json";

describe("lookupYoutubeVideoForSong", () => {
    it("looks up a corresponding video from our file based on song and artist", () => {
        const result = lookupYoutubeVideoForSong("Informer", "Snow");

        expect(result).toEqual({
            videoId: "TSffz_bl6zo",
            title: "Snow - Informer (Official Music Video) [4K Remaster]",
            channelName: "RHINO",
        });
    });

    it("returns null for non-existent songs", () => {
        const result = lookupYoutubeVideoForSong("Fake Song", "Anybody");

        expect(result).toBeNull();
    });
});
