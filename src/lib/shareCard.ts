import numberOneSongs from "../../data/number-ones.json";
import { TREND_AGE } from "@/lib/dates";
import { shareLink } from "@/lib/share";

// server only (it reads the chart file): the words on a story image, top to bottom. only the year is shown,
// never the full birth date
export type ShareCard = {
    heading: string;
    subheading: string; // the line under the heading. the birthday card has none for now
    title: string;
    artist: string;
    year: string;
    link: string;
};

const chartWeeks = new Map(numberOneSongs.map((song) => [song.date, song]));

// the song always comes from the chart file, so the image can't be made to say anything else. the year must
// sit next to the week: a birthday's chart week can fall in the year before it, and the newest week is dated ahead
export const shareCard = (week: string, year: string, kind: string): ShareCard | null => {
    if (kind !== "seventeen" && kind !== "born") return null;
    const song = chartWeeks.get(week);
    if (!song || !/^\d{4}$/.test(year) || Math.abs(Number(year) - Number(week.slice(0, 4))) > 1) return null;

    // printed without www: shorter to read and type, and Vercel sends it to the www address
    const link = shareLink(kind).replace("https://www.", "");

    return kind === "seventeen"
        ? {
              heading: "How my 2027 is going to go:",
              subheading: `The #1 song when I was ${TREND_AGE}`,
              title: song.song,
              artist: song.artist,
              year,
              link,
          }
        : {
              heading: "The #1 song the week I was born",
              subheading: "",
              title: song.song,
              artist: song.artist,
              year,
              link,
          };
};

export const titleFontSize = (title: string): number =>
    title.length <= 14 ? 128 : title.length <= 24 ? 104 : title.length <= 40 ? 84 : 68;

export const artistFontSize = (artist: string): number => (artist.length <= 40 ? 56 : 44);
