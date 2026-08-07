<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Birthday Beats

## What This Is

Web app that finds the #1 Billboard Hot 100 song on any birthdate trackable back to when Billboard data was collected.
Shows song info, album art, and playback via a Spotify 30-second preview,
falling back to an embedded YouTube video when Spotify has no preview.

## Tech Stack

Next.js (App Router), TypeScript, Tailwind, Spotify Web API, YouTube Data API.
Deployed on Vercel.

## Architecture

Single Next.js app — no separate backend. API routes make all external API
calls server-side; the frontend only ever sees our own normalized JSON shape,
never raw Spotify/YouTube response objects.

Application code lives under `src/` (`src/app/`, `src/lib/`, `src/components/`).
The `@/*` import alias maps to `./src/*`. Config files, `public/`, `data/`,
and `.env.local` stay at the project root.

## Key Files

- `src/app/api/song/route.ts` — takes a date, returns the #1 song + metadata
- `src/app/api/callback/route.ts` — Spotify OAuth callback (post-MVP only)
- `src/lib/spotify.ts` — Client Credentials token management + track search
- `src/lib/billboard.ts` — local Billboard dataset lookup (`getNumberOneSong`)
- `src/lib/youtube.ts` — YouTube music-video search (preview fallback)
- `data/` — Billboard Hot 100 dataset (gitignored if large)

## Key Decisions & Constraints

- MVP uses Spotify's **Client Credentials** flow only — no user login.
  User OAuth (Web Playback SDK) is post-MVP and limited to 5 allowlisted
  users under Spotify's 2026 Development Mode rules.
- Billboard charts are weekly: match a birthday to the nearest chart date
  **on or before** it (charts are dated Saturdays). Off-by-one prone — test
  with known dates.
- Spotify's `preview_url` is often null; the YouTube fallback is required,
  not optional.
- YouTube search costs 100 quota units of a 10,000/day budget (~100
  searches/day). Cache resolved results per chart week so repeat lookups
  cost zero API calls.
- Secrets live in `.env.local` (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
  `YOUTUBE_API_KEY`) — never commit them.
