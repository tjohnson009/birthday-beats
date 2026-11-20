import { getSongDetails } from "../songCache";
import { searchSong } from "../spotify";

// Redis answers cache reads with "not saved" but errors on the guard's counting commands
jest.mock("@upstash/redis", () => ({
    Redis: {
        fromEnv: () => ({
            get: async () => null,
            set: async () => "OK",
            incrby: async () => {
                throw new Error("ERR max requests limit exceeded");
            },
        }),
    },
}));

jest.mock("../spotify", () => ({ searchSong: jest.fn() }));

describe("getSongDetails", () => {
    beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it("shows the song without Spotify details when Redis can't count lookups", async () => {
        const result = await getSongDetails("Hey Jude", "The Beatles", { peek: false, visitor: "1.2.3.4" });

        expect(result).toEqual({ song: null, status: "limited" });
        expect(searchSong).not.toHaveBeenCalled();
    });
});
