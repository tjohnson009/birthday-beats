// the first Billboard Hot 100 chart; nothing earlier has a #1 to find
export const FIRST_CHART_DATE = "1958-08-04";

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, "0");

export const toIsoDate = (year: number, month: number, day: number): string => `${year}-${pad(month)}-${pad(day)}`;

export const parseIsoDate = (date: string): { year: number; month: number; day: number } => {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
};

// day 0 of the next month is the last day of this one
export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

// YYYY-MM-DD strings sort the same as the dates they name, so plain string comparison is enough
export const clampIsoDate = (date: string, min: string, max: string): string =>
    date < min ? min : date > max ? max : date;

// swap one part of a date (from the month/day/year picker), keeping the result a real day inside [min, max]
export const withDatePart = (
    date: string,
    change: Partial<{ year: number; month: number; day: number }>,
    min: string,
    max: string,
): string => {
    const current = parseIsoDate(date);
    const year = change.year ?? current.year;
    const month = change.month ?? current.month;
    const day = Math.min(change.day ?? current.day, daysInMonth(year, month));

    return clampIsoDate(toIsoDate(year, month, day), min, max);
};

export const randomIsoDateBetween = (min: string, max: string, random: () => number = Math.random): string => {
    const start = Date.parse(`${min}T00:00:00Z`);
    const totalDays = Math.round((Date.parse(`${max}T00:00:00Z`) - start) / DAY_MS);
    const offset = Math.floor(random() * (totalDays + 1));

    return new Date(start + offset * DAY_MS).toISOString().slice(0, 10);
};

// "2017-03-04" -> "March 4, 2017", "1984-06" -> "June 1984", "1975" -> "1975".
// pinned to UTC so the day never shifts with the viewer's time zone
export const formatLongDate = (date: string): string => {
    const [year, month, day] = date.split("-").map(Number);
    if (!month) return String(year);

    const options: Intl.DateTimeFormatOptions = { timeZone: "UTC", month: "long", year: "numeric" };
    if (day) options.day = "numeric";

    return new Date(Date.UTC(year, month - 1, day || 1)).toLocaleDateString("en-US", options);
};

// "1969-07-20" -> "Jul 20, 1969"
export const formatShortDate = (date: string): string => {
    const { year, month, day } = parseIsoDate(date);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};
