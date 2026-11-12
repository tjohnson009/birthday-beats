import { buildStripData, countWeeksAtNumberOne, weekForDate } from "../chartStrip";
import NumberOneSongs from "../../../data/number-ones.json";

const weeks = [
    { date: "1958-08-04", song: "Poor Little Fool", artist: "Ricky Nelson" },
    { date: "1958-08-11", song: "Poor Little Fool", artist: "Ricky Nelson" },
    { date: "1958-08-18", song: "Volare", artist: "Domenico Modugno" },
    { date: "1958-08-25", song: "Little Star", artist: "The Elegants" },
    { date: "1958-09-01", song: "Volare", artist: "Domenico Modugno" },
];

describe("buildStripData", () => {
    it("groups back-to-back weeks of the same song into one run", () => {
        const data = buildStripData(weeks);

        expect(data.runs).toEqual([
            ["Poor Little Fool", "Ricky Nelson", 2],
            ["Volare", "Domenico Modugno", 1],
            ["Little Star", "The Elegants", 1],
            ["Volare", "Domenico Modugno", 1],
        ]);
        expect(data.weekRun).toEqual([0, 0, 1, 2, 3]);
        expect(data.dates).toEqual(weeks.map((w) => w.date));
    });

    it("accounts for every week of the real chart history", () => {
        const data = buildStripData(NumberOneSongs);
        const weeksInRuns = data.runs.reduce((sum, [, , n]) => sum + n, 0);

        expect(data.dates).toHaveLength(NumberOneSongs.length);
        expect(weeksInRuns).toBe(NumberOneSongs.length);
    });
});

describe("weekForDate", () => {
    const dates = weeks.map((w) => w.date);

    it("finds the chart week on or before a date", () => {
        expect(weekForDate(dates, "1958-08-18")).toBe(2);
        expect(weekForDate(dates, "1958-08-21")).toBe(2);
        expect(weekForDate(dates, "1958-08-24")).toBe(2);
    });

    it("stays inside the chart at both ends", () => {
        expect(weekForDate(dates, "1950-01-01")).toBe(0);
        expect(weekForDate(dates, "2030-01-01")).toBe(4);
    });

    it("agrees with the song lookup across the 1961-62 chart gap", () => {
        const all = NumberOneSongs.map((w) => w.date);
        const i = weekForDate(all, "1962-01-03");

        expect(NumberOneSongs[i].date).toBe("1961-12-25");
    });
});

describe("countWeeksAtNumberOne", () => {
    it("numbers each week of a song's time at #1, counting a return as more of the same song", () => {
        const { nth, total } = countWeeksAtNumberOne(buildStripData(weeks));

        // Volare holds #1 in weeks 3 and 5, with Little Star in between
        expect(nth).toEqual([1, 2, 1, 1, 2]);
        expect(total).toEqual([2, 2, 2, 1, 2]);
    });

    it("gives Mariah's Christmas song one running count across every December", () => {
        const { nth, total } = countWeeksAtNumberOne(buildStripData(NumberOneSongs));
        const mariah = NumberOneSongs.flatMap((w, i) => (w.song === "All I Want For Christmas Is You" ? [i] : []));

        expect(mariah.map((i) => nth[i])).toEqual(mariah.map((_, k) => k + 1));
        expect(new Set(mariah.map((i) => total[i]))).toEqual(new Set([mariah.length]));
    });
});
