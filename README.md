# 🎂 Birthday Beats

**What was the #1 song in America the day you were born?**

**Live: [birthday-beats.vercel.app](https://birthday-beats.vercel.app)** — type your birthday, press Go, and you're listening to the answer.

Birthday Beats knows the Billboard Hot 100 #1 for every single week since the chart began on **August 4, 1958** — all 3,555 of them and counting, from Ricky Nelson's "Poor Little Fool" to whatever's on top right now — and pairs each one with album art, Spotify playback, and the official music video.

---

## How it works

```
your birthday
     │
     ▼
┌─────────────────────┐     "What chart week contains this date?"
│  lib/billboard.ts    │ ◄── 3,555 weeks of chart history (local JSON, zero API calls)
└─────────┬───────────┘
          ▼
┌─────────────────────┐     "Find this song."
│  lib/songCache.ts    │ ◄── Redis cache (40-day TTL) → Spotify Web API on a miss
└─────────┬───────────┘
          ▼
┌─────────────────────┐     "Find the music video."
│  lib/youtube.ts      │ ◄── local manifest — every video pre-resolved offline
└─────────┬───────────┘
          ▼
   album art · song info · YouTube video · Spotify embed
```

The interesting part: **there is no "Billboard API."** Chart history lives in this repo as a half-megabyte JSON file, distilled by a build script from a 42 MB community dataset of every Hot 100 chart ever published. The lookup is a pure function over sorted dates — no network, microsecond-fast, and fully unit-testable.

The YouTube side works the same way, for a different reason: YouTube's search API allows ~100 searches per day, so the app never searches at runtime. A resumable backfill script resolved the videos for all 1,194 distinct #1 songs offline (write-after-every-resolve crash safety, quota-aware clean exits), and runtime lookups hit the committed manifest for free.

Spotify gets the same treatment from a third angle: search results are cached in Redis with a 40-day expiry, so each of the 1,194 songs costs Spotify at most one API call per TTL window — and because cached entries age out on their own, album-art URLs can never go stale for longer than the window. If Redis is ever unreachable, the cache just steps aside and live search carries on.

A weekly GitHub Action keeps it all current: every Wednesday it rebuilds the chart data, resolves the video for any new #1, and commits — which redeploys the site. No human involved.

## Things I didn't expect to learn about the Billboard Hot 100

Building the date-matching logic surfaced some genuine chart archaeology:

- **Charts weren't always posted on Saturdays, but most were.** The first 178 charts (Aug 1958 – Dec 1961) were dated _Mondays_. Any "find the previous Saturday" math is quietly wrong for three years of history — so the lookup matches against real chart dates instead of assuming weekdays.
- **There's a hole in the timeline.** Billboard skipped a week switching schedules: no chart exists between **Dec 25, 1961** and **Jan 6, 1962**. Born January 3rd, 1962? Your song comes from nine days before you did.
- **Charts are dated in the future.** Each week's chart carries next Saturday's date — the dataset always contains a date that hasn't happened yet.

Every one of these is pinned by a unit test.

## Engineering Notes

The things a code reviewer would actually care about:

- **Domain-boundary discipline** Raw Spotify, YouTube, and Billboard shapes never leave `src/lib/`. The rest of the app sees only the project's own types — when Spotify removed fields from their API mid-project, exactly one file changed.
- **Search hardening by live audit** Billboard's titles and artists don't match Spotify's ("50 Cent Featuring Olivia", `End Of The Road (From "Boomerang")`, double A-sides). A live audit of all 1,194 songs found 29 search failures; layered normalization, a free-text fallback, and a small override file drove it to zero, verified by re-audit.
- **Third-party data lies** YouTube's API reports Vevo-blocked videos as embeddable; the truth only shows when a real browser loads the embed from your domain. A headless-browser audit found and replaced 14 of them. Search now filters on `videoSyndicated` + region.
- **Graceful degradation, two layers deep** If Spotify is down, the API returns a friendly 503 and the UI says so. If the stats database is down, songs still play and the footer simply omits its numbers — analytics are never allowed to break the product.
- **Derive, don't store** Visits and plays live as rows in a Postgres event log (Neon), not as counters — the footer's numbers are `count(*)` at read time, and the stored events can answer questions that haven't been asked yet. Aggregates only; nothing identifying is logged.
- **Three stores, three lifetimes** The Postgres event log never expires (facts are forever), the YouTube manifest only changes on purpose (videos are pinned deliberately), and cached Spotify results age out on a 40-day TTL (copies of someone else's data should refresh themselves). Each store was picked by access pattern: query-inside → Postgres, lookup-by-key → Redis, read-only-at-runtime → committed JSON.
- **Token caching that's actually tested** The Spotify Client Credentials token is cached at module scope with an expiry cushion — and a Jest test proves two searches produce exactly one token request.
- **An idempotent, rerunnable data pipeline** Both data scripts rebuild from source at any time, exit cleanly at quota limits, and resume where they left off.

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Spotify Web API · YouTube Data API · Neon Postgres · Upstash Redis · GitHub Actions · Vercel · Jest

## Running It Locally

```bash
npm install

# .env.local — all of these are required:
#   SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET          developer.spotify.com → create an app
#   DATABASE_URL                                       a Postgres connection string (free tier: neon.com)
#   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  a Redis instance (free tier: upstash.com)
#   YOUTUBE_API_KEY                                    only needed to re-run the video backfill

npm run dev        # → http://localhost:3000
npm test           # 27 tests, all network mocked
```

To refresh the chart data (new #1s appear weekly — the GitHub Action does this automatically):

```bash
node --experimental-strip-types src/scripts/buildBillboardData.ts
npm run build:youtube
```

## Roadmap

- [x] Spotify client — Client Credentials auth, token cache, typed track search
- [x] Billboard data pipeline — 68 years of #1s, distilled and committed
- [x] Chart-week lookup — date matching with tests for every edge the data throws
- [x] `/api/song` route — date in; song, art, video, and links out
- [x] The reveal UI — date picker, album art, song info, dual players
- [x] Deployed on Vercel
- [x] Auto-refresh chart data via scheduled GitHub Action
- [x] Visit + play tracking in a Postgres event log
- [x] Redis cache in front of Spotify search (40-day TTL)
- [ ] Polish: scroll-to-results, art-driven color scheme, share button

## Chart data

Historical chart data derives from [mhollingshead/billboard-hot-100](https://github.com/mhollingshead/billboard-hot-100) (updated daily). Billboard® and Hot 100® are trademarks of Billboard Media.
