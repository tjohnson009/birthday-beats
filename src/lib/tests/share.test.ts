import { shareImagePath, shareLink } from "../share";
import { artistFontSize, shareCard, titleFontSize } from "../shareCard";

describe("shareCard", () => {
    it("words the 17th birthday card like the trend, with the year only", () => {
        expect(shareCard("2001-05-12", "2001", "seventeen")).toEqual({
            heading: "My 2027 is going to sound like...",
            title: "All For You",
            artist: "Janet",
            detail: "the #1 song on my 17th birthday · 2001",
            cta: "Find YOUR 2027 song",
            link: "birthdaybeats.net/17",
        });
    });

    it("words the birthday card, with the year only", () => {
        expect(shareCard("1983-06-11", "1983", "born")).toEqual({
            heading: "The #1 song the week I was born",
            title: "Flashdance...What A Feeling",
            artist: "Irene Cara",
            detail: "1983",
            cta: "Find yours",
            link: "birthdaybeats.net",
        });
    });

    it("takes the year next to a chart week, for birthdays early in January or late in December", () => {
        expect(shareCard("1990-12-29", "1991", "born")?.detail).toBe("1991");
        expect(shareCard("1990-12-29", "1989", "born")?.detail).toBe("1989");
    });

    it("returns null for anything that isn't a real chart week, kind, and nearby year, so no custom text gets drawn", () => {
        const bad = [
            ["", "1983", "born"],
            ["1983-06-15", "1983", "born"], // a date, but not a chart week
            ["1983-13-40", "1983", "born"],
            ["not-a-date", "1983", "born"],
            ["1950-01-07", "1950", "born"],
            ["1983-06-11", "1985", "born"],
            ["1983-06-11", "83", "born"],
            ["1983-06-11", "", "born"],
            ["1983-06-11", "1983", "x"],
            ["1983-06-11", "1983", ""],
        ];
        for (const [week, year, kind] of bad) expect(shareCard(week, year, kind)).toBeNull();
    });
});

describe("share links", () => {
    it("points the 17th birthday card at the trend page", () => {
        expect(shareLink("seventeen")).toBe("https://www.birthdaybeats.net/17");
        expect(shareLink("born")).toBe("https://www.birthdaybeats.net");
    });

    it("builds the one image address the route accepts: chart week, year, kind", () => {
        expect(shareImagePath("2001-05-12", "2001", "seventeen")).toBe(
            "/api/share-image?week=2001-05-12&year=2001&kind=seventeen",
        );
    });
});

describe("font sizes", () => {
    it("shrinks long titles and artists so they fit", () => {
        expect(titleFontSize("Hey Jude")).toBeGreaterThan(titleFontSize("Nel Blu Dipinto Di Blu (Volare)"));
        expect(titleFontSize("Nel Blu Dipinto Di Blu (Volare)")).toBeGreaterThan(
            titleFontSize("Don't Go Breaking My Heart (And Some Other Long Words)"),
        );
        expect(artistFontSize("Janet")).toBeGreaterThan(
            artistFontSize("Dionne & Friends Featuring Elton John, Gladys Knight And Stevie Wonder"),
        );
    });
});
