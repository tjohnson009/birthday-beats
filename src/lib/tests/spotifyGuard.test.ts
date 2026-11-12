import {
    reserveSpotifyLookup,
    SITE_CALLS_PER_3_HOURS,
    VISITOR_LOOKUPS_PER_MINUTE,
    type GuardStore,
} from "../spotifyGuard";

// an in-memory stand-in for the few Redis commands the guard uses
const fakeStore = (): GuardStore & { values: Map<string, number> } => {
    const values = new Map<string, number>();
    return {
        values,
        incrby: async (key, by) => {
            const next = (values.get(key) ?? 0) + by;
            values.set(key, next);
            return next;
        },
        decrby: async (key, by) => {
            const next = (values.get(key) ?? 0) - by;
            values.set(key, next);
            return next;
        },
        expire: async () => 1,
        mget: async (...keys) => keys.map((k) => values.get(k) ?? null),
    };
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const start = Date.UTC(2026, 10, 11, 12, 0, 0);

describe("reserveSpotifyLookup", () => {
    it(`lets one visitor make ${VISITOR_LOOKUPS_PER_MINUTE} lookups a minute, then stops them`, async () => {
        const store = fakeStore();
        const results = [];
        for (let i = 0; i <= VISITOR_LOOKUPS_PER_MINUTE; i++)
            results.push(await reserveSpotifyLookup(store, "1.2.3.4", start));

        expect(results.slice(0, VISITOR_LOOKUPS_PER_MINUTE).every((r) => r === "ok")).toBe(true);
        expect(results[VISITOR_LOOKUPS_PER_MINUTE]).toBe("visitor-limit");
    });

    it("gives the visitor a fresh allowance the next minute, and doesn't slow other visitors", async () => {
        const store = fakeStore();
        for (let i = 0; i < VISITOR_LOOKUPS_PER_MINUTE; i++) await reserveSpotifyLookup(store, "1.2.3.4", start);

        expect(await reserveSpotifyLookup(store, "1.2.3.4", start + MINUTE)).toBe("ok");
        expect(await reserveSpotifyLookup(store, "5.6.7.8", start)).toBe("ok");
    });

    it("stops the whole site before it reaches Spotify's limit, then recovers after 3 hours", async () => {
        const store = fakeStore();
        let allowed = 0;
        // many different visitors, so only the site-wide budget can stop them
        for (let i = 0; i < 1000; i++) {
            if ((await reserveSpotifyLookup(store, `visitor-${i}`, start)) === "ok") allowed++;
        }

        expect(allowed).toBeGreaterThan(0);
        expect(allowed * 3).toBeLessThanOrEqual(SITE_CALLS_PER_3_HOURS);
        expect(await reserveSpotifyLookup(store, "someone-new", start + HOUR)).toBe("site-budget");
        expect(await reserveSpotifyLookup(store, "someone-new", start + 3 * HOUR)).toBe("ok");
    });

    it("gives back a reservation the site budget refused", async () => {
        const store = fakeStore();
        for (let i = 0; i < 1000; i++) await reserveSpotifyLookup(store, `visitor-${i}`, start);
        const hourKey = [...store.values.keys()].find((k) => k.startsWith("spotify:calls:"))!;

        expect(store.values.get(hourKey)).toBeLessThanOrEqual(SITE_CALLS_PER_3_HOURS);
    });
});
