import { NOTABLE_DATES } from "../notableDates";
import { FIRST_CHART_DATE, daysInMonth, parseIsoDate } from "../dates";

describe("NOTABLE_DATES", () => {
    it("has 40 dates, none repeated", () => {
        expect(NOTABLE_DATES).toHaveLength(40);
        expect(new Set(NOTABLE_DATES.map((d) => d.date)).size).toBe(40);
    });

    it("only holds real calendar days on or after the first Hot 100", () => {
        NOTABLE_DATES.forEach(({ date }) => {
            expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            const { year, month, day } = parseIsoDate(date);
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
            expect(day).toBeLessThanOrEqual(daysInMonth(year, month));
            expect(date >= FIRST_CHART_DATE).toBe(true);
        });
    });

    it("gives every date a short label", () => {
        NOTABLE_DATES.forEach(({ label }) => {
            expect(label.trim().length).toBeGreaterThan(0);
            expect(label.length).toBeLessThanOrEqual(32);
        });
    });
});
