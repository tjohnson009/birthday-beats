import { getSongDetails } from "../songCache";
import { searchSong } from "../spotify";

// a stand-in for the Redis commands songCache and the guard use; each test sets what they do. it's built
// inside the mock because songCache creates its client as soon as it's imported
jest.mock("@upstash/redis", () => {
    const store = {
        get: jest.fn(),
        set: jest.fn(),
        incrby: jest.fn(),
        decrby: jest.fn(),
        expire: jest.fn(),
        mget: jest.fn(),
    };
    return { Redis: { fromEnv: () => store }, store };
});
jest.mock("../spotify", () => ({ searchSong: jest.fn() }));

const redis = jest.requireMock("@upstash/redis").store;

const lookup = () => getSongDetails("Hey Jude", "The Beatles", { peek: false, visitor: "1.2.3.4" });

describe("getSongDetails", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
        jest.spyOn(console, "warn").mockImplementation(() => {});
        redis.get.mockResolvedValue(null);
        redis.set.mockResolvedValue("OK");
        redis.incrby.mockResolvedValue(1);
        redis.expire.mockResolvedValue(1);
        redis.mget.mockResolvedValue([null, null]);
    });
    afterEach(() => jest.restoreAllMocks());

    it("shows the song without Spotify details when Redis can't count lookups", async () => {
        redis.incrby.mockRejectedValue(new Error("ERR max requests limit exceeded"));

        expect(await lookup()).toEqual({ song: null, status: "limited" });
        expect(searchSong).not.toHaveBeenCalled();
    });

    it("remembers for a day that Spotify has no match", async () => {
        (searchSong as jest.Mock).mockResolvedValue(null);

        expect(await lookup()).toEqual({ song: null, status: "not-found" });
        expect(redis.set).toHaveBeenCalledWith("Hey Jude|The Beatles", { notFound: true }, { ex: 86_400 });
    });

    it("keeps found Spotify details for 60 days", async () => {
        const song = { trackId: "abc" };
        (searchSong as jest.Mock).mockResolvedValue(song);

        expect(await lookup()).toEqual({ song, status: "fresh" });
        expect(redis.set).toHaveBeenCalledWith("Hey Jude|The Beatles", song, { ex: 60 * 86_400 });
    });

    it("answers a remembered no-match without spending Spotify budget", async () => {
        redis.get.mockResolvedValue({ notFound: true });

        expect(await lookup()).toEqual({ song: null, status: "not-found" });
        expect(redis.incrby).not.toHaveBeenCalled();
        expect(searchSong).not.toHaveBeenCalled();
    });

    it("logs when the guard says no, so a spike shows up in the logs", async () => {
        redis.incrby.mockResolvedValue(11); // past the per-visitor limit

        expect(await lookup()).toEqual({ song: null, status: "limited" });
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("visitor-limit"));
    });
});
