import {
    addYoursPrompt,
    androidEscapeLink,
    friendShareText,
    instagramEscapeLink,
    parseSharedResult,
    parseTrendBirthday,
    sharedResultUrl,
    trendPageLink,
} from "../share";

const RESULT_17 = "https://www.birthdaybeats.net/17?week=2001-05-12&year=2001&kind=seventeen&share=1";

describe("sharedResultUrl", () => {
    it("points a 17th birthday result at /17 with its chart week, year, and kind, never a birth date", () => {
        expect(sharedResultUrl("2001-05-12", "2001", "seventeen")).toBe(RESULT_17);
    });

    it("points a birthday result at the home page", () => {
        expect(sharedResultUrl("1983-06-11", "1983", "born")).toBe(
            "https://www.birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1",
        );
    });

    it("can use the site the page is on, so the dev server and previews land on themselves", () => {
        expect(sharedResultUrl("2001-05-12", "2001", "seventeen", "http://192.168.0.90:3017")).toBe(
            "http://192.168.0.90:3017/17?week=2001-05-12&year=2001&kind=seventeen&share=1",
        );
    });
});

describe("escape links out of Instagram's browser", () => {
    it("wraps the whole result address for iPhone's extbrowser link", () => {
        expect(instagramEscapeLink(RESULT_17)).toBe(
            "instagram://extbrowser/?url=https%3A%2F%2Fwww.birthdaybeats.net%2F17%3Fweek%3D2001-05-12%26year%3D2001%26kind%3Dseventeen%26share%3D1",
        );
    });

    it("builds an Android intent link with no package, so the default browser opens it", () => {
        expect(androidEscapeLink(RESULT_17)).toBe(
            "intent://www.birthdaybeats.net/17?week=2001-05-12&year=2001&kind=seventeen&share=1#Intent;scheme=https;end",
        );
        expect(androidEscapeLink("https://www.birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1")).toBe(
            "intent://www.birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1#Intent;scheme=https;end",
        );
    });

    it("keeps the port and scheme of a dev server", () => {
        expect(androidEscapeLink("http://192.168.0.90:3017/17?week=2001-05-12&year=2001&kind=seventeen&share=1")).toBe(
            "intent://192.168.0.90:3017/17?week=2001-05-12&year=2001&kind=seventeen&share=1#Intent;scheme=http;end",
        );
    });
});

describe("parseSharedResult", () => {
    it("reads back what sharedResultUrl writes", () => {
        expect(parseSharedResult(new URL(RESULT_17).search)).toEqual({
            week: "2001-05-12",
            year: "2001",
            kind: "seventeen",
        });
        expect(parseSharedResult("?share=1&kind=born&year=1984&week=1983-12-31")).toEqual({
            week: "1983-12-31",
            year: "1984",
            kind: "born",
        });
    });

    it("ignores an address without share=1, so a plain visit stays a plain visit", () => {
        expect(parseSharedResult("")).toBeNull();
        expect(parseSharedResult("?week=2001-05-12&year=2001&kind=seventeen")).toBeNull();
        expect(parseSharedResult("?week=2001-05-12&year=2001&kind=seventeen&share=0")).toBeNull();
    });

    it("ignores anything that isn't a real week, a nearby year, and a known kind", () => {
        const bad = [
            "?week=2001-05-12&year=2001&kind=x&share=1",
            "?week=2001-05-12&year=2001&share=1",
            "?week=2001-02-30&year=2001&kind=born&share=1",
            "?week=2001-5-12&year=2001&kind=born&share=1",
            "?week=not-a-date&year=2001&kind=born&share=1",
            "?week=2001-05-12&year=2003&kind=born&share=1",
            "?week=2001-05-12&year=01&kind=born&share=1",
            "?week=2001-05-12&kind=born&share=1",
            "?week=1950-01-07&year=1950&kind=born&share=1",
        ];
        for (const search of bad) expect(parseSharedResult(search)).toBeNull();
    });
});

describe("the home page's link to /17 with the birthday filled in", () => {
    // the /17 picker's range: 17 years before the first chart, up to today
    const MIN = "1941-08-04";
    const MAX = "2026-11-23";

    it("links to /17 with the birthday, and reads it back", () => {
        expect(trendPageLink("1990-05-12")).toBe("/17?birthday=1990-05-12");
        expect(parseTrendBirthday("?birthday=1990-05-12", MIN, MAX)).toBe("1990-05-12");
    });

    it("takes the picker's first and last days", () => {
        expect(parseTrendBirthday(`?birthday=${MIN}`, MIN, MAX)).toBe(MIN);
        expect(parseTrendBirthday(`?birthday=${MAX}`, MIN, MAX)).toBe(MAX);
    });

    it("ignores a birthday that isn't a real date inside the picker's range", () => {
        const bad = [
            "",
            "?birthday=",
            "?birthday=1990-02-30",
            "?birthday=1990-5-12",
            "?birthday=not-a-date",
            "?birthday=1941-08-03",
            "?birthday=2026-11-24",
        ];
        for (const search of bad) expect(parseTrendBirthday(search, MIN, MAX)).toBeNull();
    });

    it("ignores it before the page knows today's date", () => {
        expect(parseTrendBirthday("?birthday=1990-05-12", MIN, "")).toBeNull();
    });

    it("can't be mistaken for a shared result, and a shared result wins over it", () => {
        expect(
            parseSharedResult(new URL(trendPageLink("2001-05-12"), "https://www.birthdaybeats.net").search),
        ).toBeNull();
        expect(parseTrendBirthday(`${new URL(RESULT_17).search}&birthday=1984-05-12`, MIN, MAX)).toBeNull();
    });
});

describe("share words", () => {
    it("asks friends the question that matches the picture", () => {
        expect(friendShareText("seventeen")).toBe("What was #1 on your 17th birthday?");
        expect(friendShareText("born")).toBe("What was #1 the week you were born?");
    });

    it("gives a short Add Yours prompt for each picture", () => {
        expect(addYoursPrompt("seventeen")).toBe("My 17th birthday #1");
        expect(addYoursPrompt("born")).toBe("The #1 the week I was born");
    });
});
