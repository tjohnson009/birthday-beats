// the scrub strip's view of chart history: every week's date, plus runs of back-to-back weeks
// held by the same song. kept free of the chart file itself so the browser can import it

type ChartWeek = { date: string; song: string; artist: string };

export type StripRun = [song: string, artist: string, weeks: number];

export type StripData = {
    dates: string[];
    weekRun: number[]; // for each week, the index of its run
    runs: StripRun[];
};

export const buildStripData = (weeks: readonly ChartWeek[]): StripData => {
    const runs: StripRun[] = [];
    const weekRun: number[] = [];

    for (const week of weeks) {
        const last = runs[runs.length - 1];
        if (last && last[0] === week.song && last[1] === week.artist) last[2]++;
        else runs.push([week.song, week.artist, 1]);
        weekRun.push(runs.length - 1);
    }

    return { dates: weeks.map((w) => w.date), weekRun, runs };
};

// for each week, which of its song's weeks at #1 it is, and how many that song had in all.
// a song that comes back later (Mariah, every December) keeps counting instead of starting over
export const countWeeksAtNumberOne = ({ weekRun, runs }: StripData): { nth: number[]; total: number[] } => {
    const keyOf = (run: number) => `${runs[run][0]}|${runs[run][1]}`;
    const totals = new Map<string, number>();
    const nth = weekRun.map((run) => {
        const count = (totals.get(keyOf(run)) ?? 0) + 1;
        totals.set(keyOf(run), count);
        return count;
    });
    return { nth, total: weekRun.map((run) => totals.get(keyOf(run))!) };
};

// the chart week on or before a date, clamped to the first and last weeks
export const weekForDate = (dates: readonly string[], date: string): number => {
    let low = 0;
    let high = dates.length - 1;
    let found = 0;

    while (low <= high) {
        const mid = (low + high) >> 1;
        if (dates[mid] <= date) {
            found = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return found;
};
