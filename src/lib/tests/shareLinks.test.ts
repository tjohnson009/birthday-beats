import {
    addYoursPrompt,
    androidEscapeLink,
    friendShareText,
    instagramEscapeLink,
    parseSharedResult,
    sharedResultUrl,
} from "../share";

const RESULT_17 = "https://birthdaybeats.net/17?week=2001-05-12&year=2001&kind=seventeen&share=1";

describe("sharedResultUrl", () => {
    it("points a 17th birthday result at /17 with its chart week, year, and kind, never a birth date", () => {
        expect(sharedResultUrl("2001-05-12", "2001", "seventeen")).toBe(RESULT_17);
    });

    it("points a birthday result at the home page", () => {
        expect(sharedResultUrl("1983-06-11", "1983", "born")).toBe(
            "https://birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1",
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
            "instagram://extbrowser/?url=https%3A%2F%2Fbirthdaybeats.net%2F17%3Fweek%3D2001-05-12%26year%3D2001%26kind%3Dseventeen%26share%3D1",
        );
    });

    it("builds an Android intent link with no package, so the default browser opens it", () => {
        expect(androidEscapeLink(RESULT_17)).toBe(
            "intent://birthdaybeats.net/17?week=2001-05-12&year=2001&kind=seventeen&share=1#Intent;scheme=https;end",
        );
        expect(
            androidEscapeLink("https://birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1"),
        ).toBe(
            "intent://birthdaybeats.net/?week=1983-06-11&year=1983&kind=born&share=1#Intent;scheme=https;end",
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
