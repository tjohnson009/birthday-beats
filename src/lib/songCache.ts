import { Redis } from "@upstash/redis";
import { searchSong, type Song } from "@/lib/spotify";

const redis = Redis.fromEnv();

const FORTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 40;

export const getCachedSong = async (title: string, artist: string): Promise<Song | null> => {
    const key = `${title}|${artist}`;

    try {
        const cached = await redis.get<Song>(key);
        if (cached) return cached;
    } catch (error) {
        console.error("Cache read failed:", error);
    }

    const song = await searchSong(title, artist);

    if (song) {
        try {
            await redis.set(key, song, { ex: FORTY_DAYS_IN_SECONDS });
        } catch (error) {
            console.error("Cache write failed:", error);
        }
    }

    return song;
};
