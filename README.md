# 🎂 Birthday Beats

**What was the #1 song in America the day you were born?**

Type your birthday. Five seconds later you're listening to the answer.

Birthday Beats knows the Billboard Hot 100 #1 for every single week since the chart began on **August 4, 1958** — all 3,552 of them, from Ricky Nelson's "Poor Little Fool" to whatever's on top right now — and pairs each one with Spotify metadata, album art, and playback.

> **Status:** In active development. Data pipeline and lookup engine are done and tested; API route and UI are in progress. Live demo coming soon!

---

## How it works

```
your birthday
     │
     ▼
┌─────────────────────┐     "What chart week contains this date?"
│  lib/billboard.ts    │ ◄── 3,552 weeks of chart history (local JSON, zero API calls)
└─────────┬───────────┘
          ▼
┌─────────────────────┐     "Find this song."
│  lib/spotify.ts      │ ◄── Spotify Web API (Client Credentials + cached tokens)
└─────────┬───────────┘
          ▼
   album art · artists · release date · 30-second embed
```

The interesting part: **there is no "Billboard API."** Chart history lives in this repo as a half-megabyte JSON file, distilled by a build script from a 42 MB community dataset of every Hot 100 chart ever published. The lookup is a pure function over sorted dates — no network, microsecond-fast, and fully unit-testable.

## Things I didn't expect to learn about the Billboard Hot 100

Building the date-matching logic surfaced some genuine chart archaeology:

- **Charts weren't always posted on Saturdays, but most were.** The first 178 charts (Aug 1958 – Dec 1961) were dated *Mondays*. Any "find the previous Saturday" math is quietly wrong for three years of history — so the lookup matches against real chart dates instead of assuming weekdays.
- **There's a hole in the timeline.** Billboard skipped a week switching schedules: no chart exists between **Dec 25, 1961** and **Jan 6, 1962**. Born January 3rd, 1962? Your song comes from nine days before you did. 
- **Charts are dated in the future.** Each week's chart carries next Saturday's date — the dataset always contains a date that hasn't happened yet.

Every one of these is pinned by a unit test.

## Engineering Notes

The things a code reviewer would actually care about:

- **Domain-boundary discipline** Raw Spotify and Billboard shapes never leave `src/lib/`. The rest of the app sees only the project's own types (`Song`, chart rows) — when Spotify removed fields from their API mid-project, exactly one file changed.
- **Functional core, imperative shell** Chart extraction and date lookup are pure functions; fetching and file-writing live at the edges. The payoff shows in the tests: the Spotify client needed mocked `fetch` and fixtures; the Billboard logic needed nothing but inputs.
- **Token caching that's actually tested** The Spotify Client Credentials token is cached at module scope with an expiry cushion — and a Jest test proves two searches produce exactly one token request (via `jest.resetModules()` and a call-recording mock).
- **An idempotent, rerunnable data pipeline** `src/scripts/buildBillboardData.ts` rebuilds the dataset from source at any time; a row-count checksum (3,552 and counting) guards against silent truncation.

## Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Spotify Web API · Jest

## Running It Locally

```bash
npm install

# Spotify credentials (developer.spotify.com → create an app)
cat > .env.local <<'ENV'
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
ENV

npm run dev        # → http://localhost:3000
npm test           # 9 tests: API client (mocked) + chart lookup (pure)
```

To refresh the chart data (new #1s appear weekly):

```bash
node --experimental-strip-types src/scripts/buildBillboardData.ts
```

## Roadmap

- [x] Spotify client — Client Credentials auth, token cache, typed track search
- [x] Billboard data pipeline — 68 years of #1s, distilled and committed
- [x] Chart-week lookup — date matching with tests for every edge the data throws
- [ ] `/api/song` route — the glue: date in, song + art + links out
- [ ] The reveal UI — date picker, album art, Spotify embed playback
- [ ] Deployment
- [ ] Auto-refresh chart data via scheduled GitHub Action

## Chart data

Historical chart data derives from [mhollingshead/billboard-hot-100](https://github.com/mhollingshead/billboard-hot-100) (updated daily). Billboard® and Hot 100® are trademarks of Billboard Media.