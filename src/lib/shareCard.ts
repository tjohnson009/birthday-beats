import numberOneSongs from "../../data/number-ones.json";
import { TREND_AGE } from "@/lib/dates";
import { shareLink } from "@/lib/share";

// server only (it reads the chart file): the words on a story image, top to bottom. only the year is shown,
// never the full birth date
export type ShareCard = {
    heading: string;
    title: string;
    artist: string;
    detail: string;
    cta: string;
    link: string;
};

const chartWeeks = new Map(numberOneSongs.map((song) => [song.date, song]));

// the song always comes from the chart file, so the image can't be made to say anything else. the year must
// sit next to the week: a birthday's chart week can fall in the year before it, and the newest week is dated ahead
export const shareCard = (week: string, year: string, kind: string): ShareCard | null => {
    if (kind !== "seventeen" && kind !== "born") return null;
    const song = chartWeeks.get(week);
    if (!song || !/^\d{4}$/.test(year) || Math.abs(Number(year) - Number(week.slice(0, 4))) > 1) return null;

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
