import {
    FIRST_CHART_DATE,
    clampIsoDate,
    daysInMonth,
    formatLongDate,
    formatShortDate,
    randomIsoDateBetween,
    withDatePart,
} from "../dates";

describe("daysInMonth", () => {
    it("knows short months and leap years", () => {
        expect(daysInMonth(2023, 2)).toBe(28);
        expect(daysInMonth(2024, 2)).toBe(29);
        expect(daysInMonth(1900, 2)).toBe(28);
        expect(daysInMonth(2000, 2)).toBe(29);
        expect(daysInMonth(1999, 4)).toBe(30);
        expect(daysInMonth(1999, 12)).toBe(31);
    });
});

describe("clampIsoDate", () => {
    it("keeps dates inside the range and pulls outside ones to the nearest edge", () => {
        expect(clampIsoDate("1990-05-05", FIRST_CHART_DATE, "2026-11-11")).toBe("1990-05-05");
        expect(clampIsoDate("1950-01-01", FIRST_CHART_DATE, "2026-11-11")).toBe(FIRST_CHART_DATE);
        expect(clampIsoDate("2030-01-01", FIRST_CHART_DATE, "2026-11-11")).toBe("2026-11-11");
    });
});

describe("withDatePart", () => {
    const max = "2026-11-11";

    it("changes one part of the date", () => {
        expect(withDatePart("1990-05-05", { year: 1985 }, FIRST_CHART_DATE, max)).toBe("1985-05-05");
        expect(withDatePart("1990-05-05", { month: 12 }, FIRST_CHART_DATE, max)).toBe("1990-12-05");
        expect(withDatePart("1990-05-05", { day: 31 }, FIRST_CHART_DATE, max)).toBe("1990-05-31");
    });

    it("pulls the day back when the new month is shorter", () => {
        expect(withDatePart("1990-01-31", { month: 2 }, FIRST_CHART_DATE, max)).toBe("1990-02-28");
        expect(withDatePart("2024-02-29", { year: 2023 }, FIRST_CHART_DATE, max)).toBe("2023-02-28");
    });

    it("never goes before the first chart or past the max", () => {
        expect(withDatePart("1990-03-01", { year: 1958 }, FIRST_CHART_DATE, max)).toBe(FIRST_CHART_DATE);
        expect(withDatePart("2000-12-25", { year: 2026 }, FIRST_CHART_DATE, max)).toBe(max);
    });
});

describe("randomIsoDateBetween", () => {
    it("returns the first day when the random number is 0 and the last day near 1", () => {
        expect(randomIsoDateBetween("2000-01-01", "2000-01-31", () => 0)).toBe("2000-01-01");
        expect(randomIsoDateBetween("2000-01-01", "2000-01-31", () => 0.9999)).toBe("2000-01-31");
    });

    it("stays inside the range", () => {
        for (let i = 0; i < 200; i++) {
            const date = randomIsoDateBetween(FIRST_CHART_DATE, "2026-11-11");
            expect(date >= FIRST_CHART_DATE && date <= "2026-11-11").toBe(true);
        }
    });
});

describe("formatShortDate", () => {
    it("uses a short month name", () => {
        expect(formatShortDate("1969-07-20")).toBe("Jul 20, 1969");
        expect(formatShortDate("2000-01-01")).toBe("Jan 1, 2000");
    });
});

describe("formatLongDate", () => {
    it("writes out full dates, month-only dates, and bare years", () => {
        expect(formatLongDate("2017-03-04")).toBe("March 4, 2017");
        expect(formatLongDate("1984-06")).toBe("June 1984");
        expect(formatLongDate("1975")).toBe("1975");
    });

    it("does not shift the day for viewers west of UTC", () => {
        expect(formatLongDate("1958-08-04")).toBe("August 4, 1958");
    });
});
