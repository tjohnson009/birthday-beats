import { TREND_AGE } from "@/lib/dates";

// safe for the browser: nothing here imports the chart file (that lives in shareCard.ts, server only)

export const SITE_URL = "https://birthday-beats.vercel.app";

export type ShareKind = "seventeen" | "born";

export const shareLink = (kind: ShareKind): string => (kind === "seventeen" ? `${SITE_URL}/${TREND_AGE}` : SITE_URL);

// keyed by chart week and year, never the exact date: the image only shows the year, the CDN can reuse one
// image for a whole week, and the address doesn't carry anyone's birthday. the route accepts only this form
export const shareImagePath = (week: string, year: string, kind: ShareKind): string =>
    `/api/share-image?week=${week}&year=${year}&kind=${kind}`;
