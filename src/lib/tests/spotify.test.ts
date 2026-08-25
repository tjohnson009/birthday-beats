import { searchSong } from "../spotify";
import { FAKE_SEARCH_RESPONSE } from "./fixtures";

describe("searchSong function", () => {
    beforeEach(() => {
        global.fetch = jest.fn((url) => {
            return url.toString().includes("accounts.spotify.com")
                ? Promise.resolve({ ok: true, json: async () => ({ access_token: "fake-token", expires_in: 3600 }) }) // returns fake token
                : Promise.resolve({ ok: true, json: async () => ({ tracks: { items: [] } }) }); // returns fake search results
        }) as jest.Mock;
    });

    it('runs a test', () => {
        expect(1+1).toBe(2)
    })

    it("returns null when Spotify has no match", async () => {
        const result = await searchSong("Nonexistent Song", "Nobody");
        expect(result).toBeNull();
    });

    it("maps a Spotify track to a Song", async () => {
        global.fetch = jest.fn((url) => {
            return url.toString().includes("accounts.spotify.com")
                ? Promise.resolve({ ok: true, json: async () => ({ access_token: "fake-token", expires_in: 3600 }) })
                : Promise.resolve({ ok: true, json: async () => FAKE_SEARCH_RESPONSE });
        }) as jest.Mock;

        const result = await searchSong("Kool Aid and Frozen Pizza", "Mac Miller");

        expect(result).toEqual({
            id: "1a8U4QxJR4tFvAfSPSRFGO",
            title: "Kool Aid & Frozen Pizza",
            artistList: ["Mac Miller", "Mock Featured Artist"],
            explicit: true,
            releaseDate: "2010-08-13",
            albumName: "K.I.D.S.",
            albumArt: "https://i.scdn.co/image/ab67616d0000b27382245abf18d1d165b3071241",
            albumType: "album",
            albumTotalTracks: 16,
            trackNumber: 13,
            duration: 157540,
            spotifyUrl: "https://open.spotify.com/track/1a8U4QxJR4tFvAfSPSRFGO",
        });
    });

    it("caches and reuses tokens", async () => {
        jest.resetModules(); 
        const { searchSong } = await import("../spotify"); 
        const fetchMock = global.fetch as jest.Mock; 
        
        await searchSong("Kool Aid and Frozen Pizza", "Mac Miller");
        await searchSong("Kool Aid and Frozen Pizza", "Mac Miller"); 
        
        const numTokenCalls = fetchMock.mock.calls.filter(callArgs => {
            return callArgs[0].toString().includes("accounts.spotify.com"); 
        }).length;

        expect(numTokenCalls).toEqual(1); 
        
    })
});
