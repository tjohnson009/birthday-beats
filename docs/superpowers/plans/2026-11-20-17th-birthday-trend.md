# 17th Birthday Trend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/17` trend link, a 17th-birthday/birthday switch on the result, a Story share screen, and Spotify safety fixes, live within a few hours.

**Architecture:** Same single Next.js app. `/17` renders the existing `BirthdayBeats` component with a `trend` prop. A pure date helper finds the 17th birthday. A pure `shareCard` helper decides the share image text from the chart data, and a `next/og` route draws it. The Spotify guard fails closed and every Spotify fetch gets a timeout.

**Tech Stack:** Next.js 16.2 (App Router), React 19, TypeScript, Tailwind, Jest, `next/og`, Upstash Redis.

**Spec:** `docs/superpowers/specs/2026-11-20-17th-birthday-trend-design.md`

## Global Constraints

- No emdashes in any UI copy. Plain, 6th-grade words.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md).
- Never make bulk Spotify calls outside the live site's guard. Keep local manual testing to a handful of lookups (local dev shares the Spotify developer account).
- Site budget `SITE_CALLS_PER_3_HOURS = 500`. Strip details wait `DETAILS_DELAY_MS = 2000`. Spotify fetch timeout `SPOTIFY_TIMEOUT_MS = 5000`.
- `TREND_AGE = 17`. Trend link `https://birthday-beats.vercel.app/17`. Sticker text "Find YOUR 2027 song".
- Share image: 1080x1920, year only, never the full date, text from chart data only (no album art, no Spotify).
- Code style: 4-space indent, lowercase short comments, `@/` imports, tests in `src/lib/tests/*.test.ts`.

## Review Focus

1. Instagram's in-app browser with no `navigator.clipboard` or no `navigator.share`: buttons must not throw; the link stays visible as selectable text (Task 6, manual check).
2. A Feb 29 birthday, and a 17th birthday that is exactly today or tomorrow (Task 3 tests).
3. Pressing the switch, then dragging the strip or pressing Go before the 17th birthday lookup returns: the old answer must not replace the new one (Task 5, abort the old request; manual check).
4. Bad share-image input (missing, malformed, before 1958, after today, unknown kind): a 400/404, never a 500, and no way to put custom text on the image (Task 4 tests).
5. Very long titles and artists ("Nel Blu Dipinto Di Blu (Volare)", long "Featuring" lists): the image text shrinks and wraps instead of overflowing (Task 4 test on `titleFontSize`).

---

### Task 1: Cache head start script

**Files:**

- Create: `src/scripts/prefillSongCache.ts`
- Modify: `package.json` (add `"prefill:cache": "node --experimental-strip-types src/scripts/prefillSongCache.ts"`)

- [ ] **Step 1: Write the script.** Read `data/number-ones.json` with `fs.readFileSync` (same as `buildYoutubeData.ts`). Count chart weeks per `song|artist` for dates `1977-01-01` to `2009-12-31`, sort by count descending, and keep each song's first week date. Base URL is `process.argv[2] ?? "https://birthday-beats.vercel.app"`. For each song:
    - `GET {base}/api/song?date={week}&source=strip&mode=peek`. If `spotify` is set, or `spotifyStatus` is not `"not-cached"`, log "saved" and move on with no wait.
    - Otherwise `GET {base}/api/song?date={week}&source=strip`. `fresh`: log it and wait 90 s. `limited`: log it, wait 15 min, then retry the same song. `not-found` or `unavailable`: log it and wait 90 s. A network error: wait 90 s and move on.
    - Log `[n/total] title - artist: status`, and a summary at the end.
- [ ] **Step 2: Dry check.** Run `node --experimental-strip-types src/scripts/prefillSongCache.ts http://localhost:0` and expect it to print the first song and a network error, proving the list builds without calling the live site.
- [ ] **Step 3: Commit**, then start it against the live site in the background: `npm run prefill:cache`.

### Task 2: Spotify safety

**Files:**

- Modify: `src/lib/spotifyGuard.ts` (`SITE_CALLS_PER_3_HOURS` 400 to 500)
- Modify: `src/lib/songCache.ts:30-35` (guard catch returns `limited`)
- Modify: `src/lib/spotify.ts` (all 5 `fetch` calls get `signal: AbortSignal.timeout(SPOTIFY_TIMEOUT_MS)`, `export const SPOTIFY_TIMEOUT_MS = 5000`)
- Modify: `src/components/BirthdayBeats.tsx` (`DETAILS_DELAY_MS = 2000`)
- Test: `src/lib/tests/songCache.test.ts` (new)

- [ ] **Step 1: Write the failing test** `songCache.test.ts`. Mock `@upstash/redis` so `Redis.fromEnv()` returns an object whose `get` resolves `null` and whose `incrby` rejects. Mock `@/lib/spotify` with `searchSong: jest.fn()`.

```ts
it("shows the song without Spotify details when Redis can't count lookups", async () => {
    const result = await getSongDetails("Hey Jude", "The Beatles", { peek: false, visitor: "1.2.3.4" });
    expect(result).toEqual({ song: null, status: "limited" });
    expect(searchSong).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run** `npx jest src/lib/tests/songCache.test.ts` and expect FAIL (`searchSong` was called).
- [ ] **Step 3: Implement.** In the guard's `catch`, log and `return { song: null, status: "limited" }`. Replace the old comment with one saying that without Redis the guard can't count, so Spotify isn't called. Make the budget, timeout, and delay changes above.
- [ ] **Step 4: Run** `npx jest` and expect all PASS (the guard tests read the constant).
- [ ] **Step 5: Commit.**

### Task 3: 17th birthday date math

**Files:**

- Modify: `src/lib/dates.ts`
- Test: `src/lib/tests/dates.test.ts`

**Interfaces:**

- Produces: `TREND_AGE = 17`; `nthBirthday(birthday: string, years: number): string`; `type BirthdayCheck = "ok" | "future" | "too-early"`; `checkNthBirthday(birthday: string, years: number, today: string): BirthdayCheck`.

- [ ] **Step 1: Write the failing tests.**

```ts
describe("nthBirthday", () => {
    it("moves the year and keeps the day", () => {
        expect(nthBirthday("1991-11-20", 17)).toBe("2008-11-20");
    });
    it("uses Feb 28 for a Feb 29 birthday in a non-leap year", () => {
        expect(nthBirthday("1992-02-29", 17)).toBe("2009-02-28");
        expect(nthBirthday("1992-02-29", 16)).toBe("2008-02-29");
    });
});

describe("checkNthBirthday", () => {
    it("is ok when the birthday has happened, including today", () => {
        expect(checkNthBirthday("1991-11-20", 17, "2026-11-20")).toBe("ok");
        expect(checkNthBirthday("2009-11-20", 17, "2026-11-20")).toBe("ok");
    });
    it("is future when it hasn't happened yet, even by one day", () => {
        expect(checkNthBirthday("2009-11-21", 17, "2026-11-20")).toBe("future");
        expect(checkNthBirthday("2014-03-02", 17, "2026-11-20")).toBe("future");
    });
    it("is too-early when it was before the first chart", () => {
        expect(checkNthBirthday("1941-08-03", 17, "2026-11-20")).toBe("too-early");
        expect(checkNthBirthday("1941-08-04", 17, "2026-11-20")).toBe("ok");
    });
});
```

- [ ] **Step 2: Run** `npx jest src/lib/tests/dates.test.ts` and expect FAIL (not exported).
- [ ] **Step 3: Implement** with `parseIsoDate`, `daysInMonth`, `toIsoDate`, and string comparison against `FIRST_CHART_DATE` and `today`.
- [ ] **Step 4: Run** the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 4: Share image

**Files:**

- Create: `src/lib/share.ts`, `src/app/api/share-image/route.tsx`, `src/assets/fonts/BricolageGrotesque-ExtraBold.ttf`, `src/assets/fonts/BricolageGrotesque-SemiBold.ttf` (static TTFs from Google Fonts, OFL; keep both under 500 KB total)
- Test: `src/lib/tests/share.test.ts`

**Interfaces:**

- Consumes: `getNumberOneSongForDate` (`src/lib/billboard.ts`), `FIRST_CHART_DATE`.
- Produces: `SITE_URL = "https://birthday-beats.vercel.app"`; `type ShareKind = "seventeen" | "born"`; `shareLink(kind: ShareKind): string` (`/17` for seventeen); `shareImagePath(date: string, kind: ShareKind): string` (`/api/share-image?date=...&kind=...`); `type ShareCard = { heading: string; title: string; artist: string; detail: string; cta: string; link: string }`; `shareCard(date: string, kind: string, today: string): ShareCard | null`; `titleFontSize(title: string): number`.

- [ ] **Step 1: Write the failing tests.**

```ts
it("words the 17th birthday card like the trend, year only", () => {
    expect(shareCard("2001-05-12", "seventeen", "2026-11-20")).toEqual({
        heading: "My 2027 is going to sound like...",
        title: <the #1 for 2001-05-12 from number-ones.json>,
        artist: <its artist>,
        detail: "the #1 song on my 17th birthday · 2001",
        cta: "Find YOUR 2027 song",
        link: "birthday-beats.vercel.app/17",
    });
});
it("words the birthday card", () => {
    // heading "The #1 song the week I was born", detail "1983", cta "Find yours", link "birthday-beats.vercel.app"
});
it("returns null for bad input", () => {
    for (const [date, kind] of [["", "born"], ["1983-13-40", "born"], ["1950-01-01", "born"], ["2030-01-01", "born"], ["1983-06-01", "x"]])
        expect(shareCard(date, kind, "2026-11-20")).toBeNull();
});
it("shrinks long titles", () => {
    expect(titleFontSize("Hey Jude")).toBeGreaterThan(titleFontSize("Nel Blu Dipinto Di Blu (Volare)"));
});
```

- [ ] **Step 2: Run** `npx jest src/lib/tests/share.test.ts` and expect FAIL.
- [ ] **Step 3: Implement `share.ts`.** `titleFontSize` steps down by length: 128 up to 14 characters, 104 up to 24, 84 up to 40, then 68.
- [ ] **Step 4: Run** the tests and expect PASS.
- [ ] **Step 5: Implement the route** after reading `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`. Validate with `shareCard(date, kind, todayInUtc)`, and return 400 JSON when it's null. Draw 1080x1920 with `ImageResponse`: a dark background with the brand gradient (`#2F6BFF` to `#16C79A`), the logo mark (an inline SVG like `LogoMark`), the heading, title (`titleFontSize`), artist, and detail. Leave an empty ~260px band for the link sticker, then the cta and link at the bottom. Load fonts with `readFile(join(process.cwd(), "src/assets/fonts/..."))`. Set the header `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
- [ ] **Step 6: Check.** Run `npm run dev`, open `/api/share-image?date=2001-05-12&kind=seventeen`, `...?date=1958-08-11&kind=born` (long title "Nel Blu..."), and `...?date=bad&kind=born` (400). Look at the PNGs.
- [ ] **Step 7: Commit.**

### Task 5: `/17` page, the switch, and the label

**Files:**

- Create: `src/app/17/page.tsx`, `src/components/BirthdaySwitch.tsx`
- Modify: `src/components/BirthdayBeats.tsx`

**Interfaces:**

- Consumes: `TREND_AGE`, `nthBirthday`, `checkNthBirthday`, `formatShortDate` (Task 3).
- Produces: `BirthdayBeats` prop `trend?: boolean`; `BirthdaySwitch` props `{ view: "born" | "seventeen"; check: BirthdayCheck; turnsYear: number; onToggle: () => void }`. `BirthdayBeats` state `view`, plus `birthday` (the date last searched), for Task 6.

- [ ] **Step 1: Page.** `src/app/17/page.tsx` mirrors `src/app/page.tsx` with `trend` and exports `metadata`: title "What was the #1 song on your 17th birthday? · Birthday Beats", description "The trend says the #1 song on your 17th birthday is how your 2027 will go. Enter your birthday to hear yours."
- [ ] **Step 2: Copy.** When `trend` is set, the h1 is "What was the [#1 song] on your 17th birthday?" (same gradient span), the intro is "The trend says it's how your 2027 will go. Enter your birthday to find yours.", and the date label is "Your birthday".
- [ ] **Step 3: Views.** `search(date)` sets `birthday`. On `/17` with check `ok`, it looks up `nthBirthday(date, TREND_AGE)` and sets view `seventeen`. On `/` it looks up the birthday, as today. `onToggle` looks up the other date and flips `view`. Keep both results in state so switching back doesn't refetch. Abort the previous `/api/song` request whenever a new one starts (search, toggle, or strip). A strip move or rest sets view `born` and drops the 17th birthday result.
- [ ] **Step 4: Switch component.** It shows once a result is on screen, placed between the form and the results. Text: `born` + ok gives "Your 17th birthday #1". `seventeen` gives "Back to the day you were born". `future` is disabled, "You turn 17 in {turnsYear}". `too-early` is disabled, "Charts start in 1958".
- [ ] **Step 5: Label and note.** In `seventeen` view, show a line above the result grid: "#1 on your 17th birthday · {formatShortDate(nthBirthday(birthday, 17))}". On `/17` when the check is `future`, show the birthday result with the note "You turn 17 in {year}. Here's the #1 from the day you were born."
- [ ] **Step 6: Check** with `npm run dev` at 390px and 1280px: `/17`, a birthday of 1984-06-15, Go (17th birthday song plus label), switch back and forth (no refetch the second time), a 2012 birthday (note plus disabled button), 1992-02-29, then drag the strip (back to birthday mode). `/` still works as before. Use few lookups, since this is live Spotify.
- [ ] **Step 7: Commit.**

### Task 6: Share screen

**Files:**

- Create: `src/components/ShareSheet.tsx`
- Modify: `src/components/BirthdayBeats.tsx` (a Share button next to the switch, opening the sheet)

**Interfaces:**

- Consumes: `shareImagePath`, `shareLink`, `ShareKind` (Task 4); `view` and `birthday` (Task 5). The image date is `nthBirthday(birthday, 17)` for `seventeen`, or `birthday` for `born` (or the strip date when browsing).
- Produces: `ShareSheet` props `{ date: string; kind: ShareKind; onClose: () => void }`.

- [ ] **Step 1: Build the sheet** as a `<dialog>` opened with `showModal()`. It closes on Escape, the backdrop, and a Close button. Contents:
    - the image as a plain `<img>` (max height so it fits a phone screen), with the caption "Press and hold to save, or take a screenshot";
    - **Copy link**, which uses `navigator.clipboard.writeText` and shows "Copied!" for 2 s. If that's missing or fails, it selects a read-only text field with the link instead;
    - **Share...**, only when `navigator.canShare?.({ files: [file] })` is true. Fetch the image into a `File` when the sheet opens, so the click calls `navigator.share({ files: [file] })` right away (Safari needs that);
    - **Save image**, an `<a download="my-2027-song.png">` link, shown on wider screens;
    - the steps: "1. Add this image to your Story. 2. Add a Link sticker and paste the link. 3. Change the sticker text to "Find YOUR 2027 song"." In `born` mode, step 3 says "Find your birthday song".
- [ ] **Step 2: Check** in dev at 390px: open, Copy link, Save, Close, Escape. Then do the same with `navigator.share` and `navigator.clipboard` deleted in the console, to act like an in-app browser. Nothing should throw.
- [ ] **Step 3: Commit.**

### Task 7: Verify and ship

- [ ] **Step 1:** `npx jest`, `npm run lint`, `npm run format:check`, `npm run build`. All pass.
- [ ] **Step 2:** Add `/17` and Share to the README feature list and AGENTS.md key files (`src/app/17/page.tsx`, `src/lib/share.ts`, `src/app/api/share-image/route.tsx`, `src/scripts/prefillSongCache.ts`). Update AGENTS.md's Spotify line to note the 500 budget and that the guard fails closed.
- [ ] **Step 3:** Commit, push `feat/17th-birthday-trend`, and open a PR. Tim merges. After deploy, Tim DMs himself the `/17` link in Instagram and tests in Instagram's browser.
