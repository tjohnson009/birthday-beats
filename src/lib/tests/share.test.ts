import { artistFontSize, shareCard, shareImagePath, shareLink, titleFontSize } from "../share";

const TODAY = "2026-11-20";

describe("shareCard", () => {
    it("words the 17th birthday card like the trend, with the year only", () => {
        expect(shareCard("2001-05-12", "seventeen", TODAY)).toEqual({
            heading: "My 2027 is going to sound like...",
            title: "All For You",
            artist: "Janet",
            detail: "the #1 song on my 17th birthday · 2001",
            cta: "Find YOUR 2027 song",
            link: "birthday-beats.vercel.app/17",
        });
    });

    it("words the birthday card, with the year only", () => {
        expect(shareCard("1983-06-15", "born", TODAY)).toEqual({
            heading: "The #1 song the week I was born",
            title: "Flashdance...What A Feeling",
            artist: "Irene Cara",
            detail: "1983",
            cta: "Find yours",
            link: "birthday-beats.vercel.app",
        });
    });

    it("returns null for input it can't draw, so no custom text gets on the image", () => {
        const bad = [
            ["", "born"],
            ["1983-13-40", "born"],
            ["1983-02-30", "born"],
            ["not-a-date", "born"],
            ["1950-01-01", "born"],
            ["2030-01-01", "born"],
            ["1983-06-15", "x"],
            ["1983-06-15", ""],
        ];
        for (const [date, kind] of bad) expect(shareCard(date, kind, TODAY)).toBeNull();
    });
});

describe("share links", () => {
    it("points the 17th birthday card at the trend page", () => {
        expect(shareLink("seventeen")).toBe("https://birthday-beats.vercel.app/17");
        expect(shareLink("born")).toBe("https://birthday-beats.vercel.app");
        expect(shareImagePath("2001-05-12", "seventeen")).toBe("/api/share-image?date=2001-05-12&kind=seventeen");
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
