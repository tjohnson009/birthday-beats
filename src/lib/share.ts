import { FIRST_CHART_DATE, TREND_AGE } from "@/lib/dates";

// safe for the browser: nothing here imports the chart file (that lives in shareCard.ts, server only)

// the main address (Vercel sends birthdaybeats.net here); birthday-beats.vercel.app serves the same site,
// and pages name this one as canonical
export const SITE_URL = "https://www.birthdaybeats.net";

export type ShareKind = "seventeen" | "born";

export const shareLink = (kind: ShareKind): string => (kind === "seventeen" ? `${SITE_URL}/${TREND_AGE}` : SITE_URL);

// the 17th birthday picture comes in these styles, in the order the share sheet lists them
export const SHARE_STYLES = ["now-playing", "player", "record", "cassette"] as const;
export type ShareStyle = (typeof SHARE_STYLES)[number];

export const SHARE_STYLE_NAMES: Record<ShareStyle, string> = {
    "now-playing": "Now playing",
    player: "Player",
    record: "Record",
    cassette: "Cassette",
};

// the card colors a person can pick, in the share sheet's order. each style decides where its color goes
export const SHARE_COLORS = {
    blue: "#2F6BFF",
    green: "#16C79A",
    pink: "#FF4FA0",
    orange: "#FF7A1A",
    purple: "#7B4DFF",
    red: "#E8364F",
    ink: "#0F1E2E",
    cream: "#F3ECDF",
} as const;
export type ShareColor = keyof typeof SHARE_COLORS;

export type ShareLook = { style: ShareStyle; color: ShareColor };

export const DEFAULT_LOOK: ShareLook = { style: "now-playing", color: "blue" };

// the style and color from an image address, or null if the sheet doesn't offer them
export const parseShareLook = (style: string, color: string): ShareLook | null =>
    (SHARE_STYLES as readonly string[]).includes(style) && Object.hasOwn(SHARE_COLORS, color)
        ? { style: style as ShareStyle, color: color as ShareColor }
        : null;

// keyed by chart week and year, never the exact date: the image only shows the year, the CDN can reuse one
// image for a whole week, and the address doesn't carry anyone's birthday. the route accepts only this form.
// only the 17th birthday picture has a style and color to pick (the birthday one has one design for now)
export const shareImagePath = (week: string, year: string, kind: ShareKind, look: ShareLook = DEFAULT_LOOK): string =>
    `/api/share-image?week=${week}&year=${year}&kind=${kind}` +
    (kind === "seventeen" ? `&style=${look.style}&color=${look.color}` : "");

// a result someone opened from a share link: the page shows that week's song and opens the share sheet
export type SharedResult = { week: string; year: string; kind: ShareKind };

// the same two values as the image address, so it never carries a birth date either
export const sharedResultUrl = (week: string, year: string, kind: ShareKind, origin: string = SITE_URL): string =>
    `${origin}/${kind === "seventeen" ? TREND_AGE : ""}?week=${week}&year=${year}&kind=${kind}&share=1`;

// leaves Instagram's iPhone browser for the default browser. only works as a tapped link
export const instagramEscapeLink = (url: string): string => `instagram://extbrowser/?url=${encodeURIComponent(url)}`;

// leaves Instagram's Android browser. no package=, so it opens the default browser, which fails less
// than naming Chrome. Chrome needs a tap for this too
export const androidEscapeLink = (url: string): string => {
    const { protocol, host, pathname, search } = new URL(url);
    return `intent://${host}${pathname}${search}#Intent;scheme=${protocol.replace(":", "")};end`;
};

const isRealDate = (date: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(Date.parse(date)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

// reads a sharedResultUrl back. anything else gives null and the page loads as usual
export const parseSharedResult = (search: string): SharedResult | null => {
    const params = new URLSearchParams(search);
    const [week, year, kind] = ["week", "year", "kind"].map((name) => params.get(name) ?? "");
    if (params.get("share") !== "1") return null;
    if (kind !== "seventeen" && kind !== "born") return null;
    if (!isRealDate(week) || week < FIRST_CHART_DATE) return null;
    // the year sits next to the week: a birthday's chart week can fall in the year before it
    if (!/^\d{4}$/.test(year) || Math.abs(Number(year) - Number(week.slice(0, 4))) > 1) return null;
    return { week, year, kind };
};

export const friendShareText = (kind: ShareKind): string =>
    kind === "seventeen" ? `What was #1 on your ${TREND_AGE}th birthday?` : "What was #1 the week you were born?";

// typed into Instagram's Add Yours sticker
export const addYoursPrompt = (kind: ShareKind): string =>
    kind === "seventeen" ? `My ${TREND_AGE}th birthday #1` : "The #1 the week I was born";
