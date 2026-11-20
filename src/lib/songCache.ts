import { Redis } from "@upstash/redis";
import { searchSong, type Song } from "@/lib/spotify";
import { reserveSpotifyLookup } from "@/lib/spotifyGuard";
import type { SpotifyStatus } from "@/lib/songResult";

// a struggling Redis answers fast instead of holding every lookup for seconds: one quick retry, then a
// 1.5 s limit per command (the guard then fails closed and the song shows without Spotify details)
const redis = Redis.fromEnv({
    retry: { retries: 1, backoff: () => 100 },
    signal: () => AbortSignal.timeout(1500),
});

const FORTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 40;
// "Spotify has no match" is remembered for a day, so repeat lookups of that song spend no Spotify budget
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

type CacheEntry = Song | { notFound: true };

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
        const cached = await redis.get<CacheEntry>(key);
        if (cached && "notFound" in cached) return { song: null, status: "not-found" };
        if (cached) return { song: cached, status: "cached" };
    } catch (error) {
        console.error("Cache read failed:", error);
    }

    if (peek) return { song: null, status: "not-cached" };

    try {
        const guard = await reserveSpotifyLookup(redis, visitor);
        if (guard !== "ok") {
            console.warn(`Spotify guard said no (${guard}) for ${key}`);
            return { song: null, status: "limited" };
        }
    } catch (error) {
        // with Redis down the guard can't count, and uncounted searches could set off a Spotify lockout,
        // so the song shows without Spotify details instead
        console.error("Spotify guard failed:", error);
        return { song: null, status: "limited" };
    }

    let song: Song | null;
    try {
        song = await searchSong(title, artist);
    } catch (error) {
        console.error("Spotify search failed:", error);
        return { song: null, status: "unavailable" };
    }

    try {
        if (!song) await redis.set(key, { notFound: true }, { ex: ONE_DAY_IN_SECONDS });
        else await redis.set(key, song, { ex: FORTY_DAYS_IN_SECONDS });
    } catch (error) {
        console.error("Cache write failed:", error);
    }

    return song ? { song, status: "fresh" } : { song: null, status: "not-found" };
};
