import { Redis } from "@upstash/redis";
import { searchSong, type Song } from "@/lib/spotify";
import { reserveSpotifyLookup } from "@/lib/spotifyGuard";
import type { SpotifyStatus } from "@/lib/songResult";

const redis = Redis.fromEnv();

const FORTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 40;

type LookupOptions = {
    peek: boolean; // only read the cache, never call Spotify
    visitor: string;
};

export const getSongDetails = async (
    title: string,
    artist: string,
    { peek, visitor }: LookupOptions,
): Promise<{ song: Song | null; status: SpotifyStatus }> => {
    const key = `${title}|${artist}`;

    try {
        const cached = await redis.get<Song>(key);
        if (cached) return { song: cached, status: "cached" };
    } catch (error) {
        console.error("Cache read failed:", error);
    }

    if (peek) return { song: null, status: "not-cached" };

    try {
        if ((await reserveSpotifyLookup(redis, visitor)) !== "ok") return { song: null, status: "limited" };
    } catch (error) {
        // with Redis down the guard can't count, so searches carry on as they did before it existed
        console.error("Spotify guard failed:", error);
    }

    let song: Song | null;
    try {
        song = await searchSong(title, artist);
    } catch (error) {
        console.error("Spotify search failed:", error);
        return { song: null, status: "unavailable" };
    }

    if (!song) return { song: null, status: "not-found" };

    try {
        await redis.set(key, song, { ex: FORTY_DAYS_IN_SECONDS });
    } catch (error) {
        console.error("Cache write failed:", error);
    }

    return { song, status: "fresh" };
};
