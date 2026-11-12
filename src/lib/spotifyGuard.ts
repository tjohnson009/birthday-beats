// keeps Spotify lookups under the developer account's limit (~700 calls in ~3 hours, then a 3-hour
// lockout that takes the site down). two checks, both counted in Redis: one visitor can't make more
// than a few lookups a minute, and the whole site stops well short of Spotify's limit

export const VISITOR_LOOKUPS_PER_MINUTE = 10;
export const SITE_CALLS_PER_3_HOURS = 400;
export const CALLS_PER_LOOKUP = 3; // a search can take up to 3 calls: the search, a retry, a free-text fallback

export type GuardResult = "ok" | "visitor-limit" | "site-budget";

// the Redis commands the guard needs, so tests can pass an in-memory stand-in
export type GuardStore = {
    incrby(key: string, increment: number): Promise<number>;
    decrby(key: string, decrement: number): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    mget(...keys: string[]): Promise<unknown[]>;
};

const visitorKey = (visitor: string, minute: number) => `spotify:visitor:${visitor}:${minute}`;
const hourKey = (hour: number) => `spotify:calls:${hour}`;

export const reserveSpotifyLookup = async (
    store: GuardStore,
    visitor: string,
    now = Date.now(),
): Promise<GuardResult> => {
    const minute = Math.floor(now / 60_000);
    const lookups = await store.incrby(visitorKey(visitor, minute), 1);
    if (lookups === 1) await store.expire(visitorKey(visitor, minute), 120);
    if (lookups > VISITOR_LOOKUPS_PER_MINUTE) return "visitor-limit";

    // reserve the worst case up front, then count it against this hour and the two before it
    const hour = Math.floor(now / 3_600_000);
    const thisHour = await store.incrby(hourKey(hour), CALLS_PER_LOOKUP);
    if (thisHour === CALLS_PER_LOOKUP) await store.expire(hourKey(hour), 4 * 3600);
    const earlier = await store.mget(hourKey(hour - 1), hourKey(hour - 2));
    const total = thisHour + earlier.reduce<number>((sum, calls) => sum + Number(calls ?? 0), 0);

    if (total > SITE_CALLS_PER_3_HOURS) {
        await store.decrby(hourKey(hour), CALLS_PER_LOOKUP);
        return "site-budget";
    }
    return "ok";
};
