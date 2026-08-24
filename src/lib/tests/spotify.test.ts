import { searchSong } from "../spotify";

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
});
