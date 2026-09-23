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

    it("runs a test", () => {
        expect(1 + 1).toBe(2);
    });

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

    it("strips collaboration credits from the artist in the search query", async () => {
        await searchSong("Candy Shop", "50 Cent Featuring Olivia");

        const searchCall = (global.fetch as jest.Mock).mock.calls.find(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        const query = new URL(searchCall[0].toString()).searchParams.get("q");

        expect(query).toBe("track:Candy Shop artist:50 Cent");
    });

    it("leaves artists without credit words untouched", async () => {
        await searchSong("So Sick", "Ne-Yo");

        const searchCall = (global.fetch as jest.Mock).mock.calls.find(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        const query = new URL(searchCall[0].toString()).searchParams.get("q");

        expect(query).toBe("track:So Sick artist:Ne-Yo");
    });

    it("strips movie credits from the title in the search query", async () => {
        await searchSong('End Of The Road (From "Boomerang")', "Boyz II Men");

        const searchCall = (global.fetch as jest.Mock).mock.calls.find(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        const query = new URL(searchCall[0].toString()).searchParams.get("q");

        expect(query).toBe("track:End Of The Road artist:Boyz II Men");
    });

    it("searches only the first side of a double A-side title", async () => {
        await searchSong("It's Too Late/I Feel The Earth Move", "Carole King");

        const searchCall = (global.fetch as jest.Mock).mock.calls.find(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        const query = new URL(searchCall[0].toString()).searchParams.get("q");

        expect(query).toBe("track:It's Too Late artist:Carole King");
    });

    it("searches with the aliased artist for known problem songs", async () => {
        await searchSong("My Universe", "Coldplay x BTS");

        const searchCall = (global.fetch as jest.Mock).mock.calls.find(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        const query = new URL(searchCall[0].toString()).searchParams.get("q");

        expect(query).toBe("track:My Universe artist:Coldplay");
    });

    it("retries as free text when the filtered search misses", async () => {
        global.fetch = jest.fn((url) => {
            const u = url.toString();
            if (u.includes("accounts.spotify.com")) {
                return Promise.resolve({ ok: true, json: async () => ({ access_token: "fake-token", expires_in: 3600 }) });
            }
            return u.includes(encodeURIComponent("track:"))
                ? Promise.resolve({ ok: true, json: async () => ({ tracks: { items: [] } }) }) // filtered query misses
                : Promise.resolve({ ok: true, json: async () => FAKE_SEARCH_RESPONSE }); // free-text query hits
        }) as jest.Mock;

        const result = await searchSong("Kool Aid and Frozen Pizza", "Mac Miller");

        const searchCalls = (global.fetch as jest.Mock).mock.calls.filter(callArgs =>
            callArgs[0].toString().includes("api.spotify.com")
        );
        expect(searchCalls).toHaveLength(2);
        expect(new URL(searchCalls[1][0].toString()).searchParams.get("q")).toBe("Kool Aid and Frozen Pizza Mac Miller");
        expect(result).not.toBeNull();
    });

    it("caches and reuses tokens", async () => {
        jest.resetModules();
        const { searchSong } = await import("../spotify");
        const fetchMock = global.fetch as jest.Mock;

        await searchSong("Kool Aid and Frozen Pizza", "Mac Miller");
        await searchSong("Kool Aid and Frozen Pizza", "Mac Miller");

        const numTokenCalls = fetchMock.mock.calls.filter((callArgs) => {
            return callArgs[0].toString().includes("accounts.spotify.com");
        }).length;

        expect(numTokenCalls).toEqual(1);
    });
});
