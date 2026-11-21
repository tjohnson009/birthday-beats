import { parseShareLook, shareImagePath, shareLink } from "../share";
import { artistFontSize, shareCard, titleFontSize } from "../shareCard";

describe("shareCard", () => {
    it("words the 17th birthday card like the trend, with the year only and the /17 page as the link", () => {
        expect(shareCard("2001-05-12", "2001", "seventeen")).toEqual({
            heading: "How my 2027 is going to go:",
            subheading: "The #1 song when I was 17",
            title: "All For You",
            artist: "Janet",
            year: "2001",
            link: "birthdaybeats.net/17",
        });
    });

    it("words the birthday card, with the year only", () => {
        expect(shareCard("1983-06-11", "1983", "born")).toEqual({
            heading: "The #1 song the week I was born",
            subheading: "",
            title: "Flashdance...What A Feeling",
            artist: "Irene Cara",
            year: "1983",
            link: "birthdaybeats.net",
        });
    });

    it("takes the year next to a chart week, for birthdays early in January or late in December", () => {
        expect(shareCard("1990-12-29", "1991", "born")?.year).toBe("1991");
        expect(shareCard("1990-12-29", "1989", "born")?.year).toBe("1989");
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

    it("builds the one image address the route accepts: chart week, year, kind, then the 17th card's look", () => {
        expect(shareImagePath("2001-05-12", "2001", "seventeen", { style: "record", color: "pink" })).toBe(
            "/api/share-image?week=2001-05-12&year=2001&kind=seventeen&style=record&color=pink",
        );
        expect(shareImagePath("1983-06-11", "1983", "born")).toBe(
            "/api/share-image?week=1983-06-11&year=1983&kind=born",
        );
    });

    it("gives the 17th card the now playing style in blue unless a look is picked", () => {
        expect(shareImagePath("2001-05-12", "2001", "seventeen")).toBe(
            "/api/share-image?week=2001-05-12&year=2001&kind=seventeen&style=now-playing&color=blue",
        );
    });

    it("leaves the look off the birthday card, which has one design for now", () => {
        expect(shareImagePath("1983-06-11", "1983", "born", { style: "record", color: "pink" })).toBe(
            "/api/share-image?week=1983-06-11&year=1983&kind=born",
        );
    });
});

describe("parseShareLook", () => {
    it("reads a style and color the share sheet offers", () => {
        expect(parseShareLook("cassette", "cream")).toEqual({ style: "cassette", color: "cream" });
        expect(parseShareLook("now-playing", "ink")).toEqual({ style: "now-playing", color: "ink" });
    });

    it("returns null for anything else, so the route never draws an unknown style or color", () => {
        const bad = [
            ["", "blue"],
            ["record", ""],
            ["clickwheel", "blue"],
            ["record", "teal"],
            ["record", "#2F6BFF"],
            ["Record", "blue"],
            ["toString", "blue"],
            ["record", "constructor"],
        ];
        for (const [style, color] of bad) expect(parseShareLook(style, color)).toBeNull();
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
