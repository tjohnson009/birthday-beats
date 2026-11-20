import { getNumberOneSongForDate } from "@/lib/billboard";
import { FIRST_CHART_DATE, TREND_AGE, daysInMonth, parseIsoDate } from "@/lib/dates";

export const SITE_URL = "https://birthday-beats.vercel.app";

export type ShareKind = "seventeen" | "born";

// the words on a story image, top to bottom. only the year is shown, never the full birth date
export type ShareCard = {
    heading: string;
    title: string;
    artist: string;
    detail: string;
    cta: string;
    link: string;
};

export const shareLink = (kind: ShareKind): string => (kind === "seventeen" ? `${SITE_URL}/${TREND_AGE}` : SITE_URL);

export const shareImagePath = (date: string, kind: ShareKind): string => `/api/share-image?date=${date}&kind=${kind}`;

const isRealDate = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const { year, month, day } = parseIsoDate(date);
    return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

// the song always comes from the chart file, so the image can't be made to say anything else
export const shareCard = (date: string, kind: string, today: string): ShareCard | null => {
    if (kind !== "seventeen" && kind !== "born") return null;
    if (!isRealDate(date) || date < FIRST_CHART_DATE || date > today) return null;

    const song = getNumberOneSongForDate(date);
    if (!song) return null;

    const year = date.slice(0, 4);
    const link = shareLink(kind).replace("https://", "");

    return kind === "seventeen"
        ? {
              heading: "My 2027 is going to sound like...",
              title: song.song,
              artist: song.artist,
              detail: `the #1 song on my ${TREND_AGE}th birthday · ${year}`,
              cta: "Find YOUR 2027 song",
              link,
          }
        : {
              heading: "The #1 song the week I was born",
              title: song.song,
              artist: song.artist,
              detail: year,
              cta: "Find yours",
              link,
          };
};

export const titleFontSize = (title: string): number =>
    title.length <= 14 ? 128 : title.length <= 24 ? 104 : title.length <= 40 ? 84 : 68;

export const artistFontSize = (artist: string): number => (artist.length <= 40 ? 56 : 44);
