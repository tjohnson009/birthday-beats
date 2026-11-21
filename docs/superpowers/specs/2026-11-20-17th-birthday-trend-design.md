# 17th Birthday Trend: Design

Date: 2026-11-20. Status: approved by Tim ("Go"), with the changes in "Tim's changes" below.

## Tim's changes (2026-11-20)

- Site-wide Spotify budget goes from 400 to **500 calls per 3 hours**. Spotify doesn't publish the lockout line. The only hard number is the 2026-10-10 incident: about 730 calls in about 60 minutes set it off. The budget counts the worst case (3 calls per lookup), and most lookups use 1, so real calls stay well under 500.
- The strip waits **2 seconds** (was 1.5) at rest before asking Spotify for a song that isn't saved yet.
- Share image wording leans into the trend (see section 2).

## Why

A trend is growing on TikTok, Instagram, and Lemon8: "the #1 song on your 17th birthday is how your 2027 is going to go." Tim wants Birthday Beats to ride it and spread, mostly through Instagram Stories with a link sticker. It needs to be live within a few hours. The trend is about 2027, so it will likely peak around New Year's.

This builds idea M6 from `docs/ideation/2026-11-11-new-directions-ideation.html` (Tim chose it on Nov 11 as a toggle on the result). The age changes from 14 to 17 to match the trend.

## How people will spread it (from Tim)

1. Someone posts a Story with their 17th birthday song, the trend wording, and a link sticker with custom text like "Find YOUR 2027 song."
2. A follower taps it. The site opens in Instagram's built-in browser.
3. They enter their birthday and see their 17th birthday #1 right away.
4. They tap Share, save the story image, copy the link, and post their own Story the same way.

No website can post into an Instagram Story or attach a link sticker. The person does those steps, and we make them as short as possible.

## Goals

- A trend link, `/17`, that opens in "17th birthday" mode.
- A button on the result that switches between the 17th birthday #1 and the birthday #1, on both `/` and `/17`.
- A Share screen with a story-size image, a Copy link button, and three short steps.
- The site holds up under a rush of visitors without a Spotify lockout.

## Non-goals

Ads. Videos or audio files. Separate Instagram and TikTok buttons. Pages for each week (M1). Posting straight to Instagram or TikTok.

## Anti-goals (failures even if it works)

- Anything that can set off a Spotify lockout (see the 2026-10-10 incident).
- Breaking the plain birthday lookup on `/`.
- A share image that shows someone's full birth date.

## Approaches considered

**Getting people to the 17th birthday song**

- A. Button only: Go shows the birthday song, then one more tap. Simple, but people from the trend land on "the day you were born" and have to find the button.
- **B. Trend link `/17` plus the button (picked by Tim).** The page matches the trend, Go lands right on the song, and there is a link to put on a sticker.

**Sharing**

- Two buttons, "Share to Instagram" and "Share to TikTok." Both would just open the phone's share menu, and that menu may not work inside Instagram's built-in browser.
- **One Share button that opens a share screen (picked).** It shows the image as a plain picture you can press and hold to save or screenshot, which works in any browser. It also has Copy link, and a "Share..." button only when the phone supports it.

**Making the image**

- Draw it in the browser (canvas). Downloads and file sharing are unreliable in in-app browsers.
- **Make it on the server with `next/og` (picked).** It's a plain image URL, works everywhere, and the CDN can cache it so each image is made once.

## What gets built

### 1. The trend link and the 17th birthday button

- A new page at `/17` uses the same `BirthdayBeats` component in 17th birthday mode.
- `/17` headline: "What was the #1 song on your 17th birthday?" Under it: "The trend says it's how your 2027 will go. Enter your birthday to find yours." Date label: "Your birthday." The page title and description match, for link previews.
- On `/17`, Go shows the #1 from the date 17 years after the birthday.
- On both pages, once a result is showing, a button sits between the date box and the result (Tim's Nov 11 placement). It reads "Your 17th birthday #1" in birthday mode and "Back to the day you were born" in 17th birthday mode. It swaps the result in the same layout.
- In 17th birthday mode the result gets one line: "#1 on your 17th birthday · Nov 20, 2008." The birthday result stays as it is today.
- The date picker and strip stay on the birthday. Dragging the strip goes back to normal week browsing (birthday mode). Picking a new date and pressing Go keeps the page's mode (17th birthday on `/17`, birthday on `/`).
- **Edge cases:**
    - Feb 29 birthdays use Feb 28 when the 17th year isn't a leap year.
    - If the 17th birthday is after today, the button is greyed out and reads "You turn 17 in 2031" (their year). On `/17`, Go shows the birthday song with the note "You turn 17 in 2031. Here's the #1 from the day you were born."
    - If the 17th birthday is before Aug 4, 1958, the button is greyed out and says the charts start in 1958.
- The date math goes in `src/lib/dates.ts` with unit tests.

### 2. Share

- A Share button on the result, in both modes.
- It opens a full-screen share screen with:
    - the story image, shown as a normal `<img>` so press and hold saves it;
    - **Copy link**, which copies `https://birthday-beats.vercel.app/17`;
    - **Share...**, only if `navigator.canShare({ files })` says yes;
    - **Save image** (a download) on computers;
    - three steps: "1. Add this image to your Story. 2. Add a Link sticker and paste. 3. Change the sticker text to 'Find YOUR 2027 song'."
- **The image** is 1080x1920, made by a route like `/api/share-image`. It shows the **year only**, never the full date. It leaves an empty band near the bottom for the link sticker. Wording, top to bottom:
    - 17th birthday mode: "My 2027 is going to sound like..." / song (big) / artist / "the #1 song on my 17th birthday · 2001" / (sticker space) / "Find YOUR 2027 song" / "birthday-beats.vercel.app/17", with the logo.
    - Birthday mode: "The #1 song the week I was born" / song / artist / "1983" / (sticker space) / "Find yours" / "birthday-beats.vercel.app", with the logo.
- It uses chart data only, with no album art and no Spotify calls. That way it works for every song even when Spotify is limited, and it stays clear of Spotify's artwork rules.
- The image URL depends only on the chart week, the mode, and the year, so the CDN caches it and each image is made once.

### 3. Holding up under a rush

What already exists and stays: the per-visitor limit (10 Spotify lookups a minute), the site-wide budget (400 Spotify calls per 3 hours), the 40-day Redis cache of Spotify details, the "song without Spotify details" fallback, YouTube videos from a local file (no YouTube API calls on the live site), chart data from a local file, and stats logging that can fail without breaking a lookup.

Changes:

- **The guard fails closed.** Today, if Redis errors (an outage, or the plan's monthly command limit), `songCache.ts` skips the guard and calls Spotify with no limit. In a rush that could cause a lockout in minutes. Instead, a Redis error returns `limited`, so the song shows without Spotify details. Update the comment and add a test.
- **Spotify calls time out after about 5 seconds**, so a hung Spotify call can't hold a request open.
- **Site budget 500, strip wait 2 seconds** (Tim's changes above).
- **Cache head start:** a small script (`src/scripts/`) that runs on Tim's machine. It works through the songs that cover the most 17th birthday weeks (1977 to 2009: the top 150 songs cover 58% of those weeks), one at a time. For each one it first asks the live site with `mode=peek`, which only reads the cache and is free. Only if the song isn't saved does it do a full lookup (`/api/song?date=...&source=strip`), at most about 40 an hour. It goes through the live site, so the guard counts every call and it can never pass the budget. `source=strip` keeps it out of the stats. If it gets `limited`, it waits 15 minutes. It can start before this ships, since it only uses the existing endpoint. It shares the budget with real visitors, so stop it once real traffic picks up.

## Testing

- Unit tests: the 17th birthday date (normal, Feb 29, future, before 1958) and the guard failing closed.
- Run the app and check `/` and `/17` at phone and desktop size, the button in both directions, and the share screen.
- Before posting: DM the deployed `/17` link to yourself in Instagram and tap it, to test inside Instagram's browser (saving the image, Copy link).

## Rollout

Feature branch, then a PR. Tim merges, and Vercel deploys.

## Left to the builder

Exact styling of the button, label line, share screen, and image (match the current look: Bricolage display font, brand blue and green). Query parameter names for the image route. The script's exact pace and song order.

## Not now

Ads (AdSense approval takes days to weeks, and Vercel's Hobby plan is for non-commercial use). M2, the saved Spotify archive, is the real fix if traffic stays heavy for days. Logging stats after the response instead of before.
