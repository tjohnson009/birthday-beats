import { searchTerms, songSearchText } from "../songSearch";

describe("songSearchText", () => {
    it("puts the title and artist together, ready to paste into a music search", () => {
        expect(songSearchText("Lady Marmalade", "Christina Aguilera, Lil' Kim, Mya & P!nk")).toBe(
            "Lady Marmalade Christina Aguilera, Lil' Kim, Mya & P!nk",
        );
    });

    it("keeps only the lead artist when others are featured", () => {
        expect(songSearchText("Break Your Heart", "Taio Cruz Featuring Ludacris")).toBe("Break Your Heart Taio Cruz");
        expect(
            songSearchText("I'm The One", "DJ Khaled Featuring Justin Bieber, Quavo, Chance The Rapper & Lil Wayne"),
        ).toBe("I'm The One DJ Khaled");
    });

    it("drops soundtrack notes and keeps the first side of a double A-side", () => {
        expect(songSearchText('End Of The Road (From "Boomerang")', "Boyz II Men")).toBe("End Of The Road Boyz II Men");
        expect(songSearchText("Don't Be Cruel/Hound Dog", "Elvis Presley")).toBe("Don't Be Cruel Elvis Presley");
    });

    it("keeps parentheses that are part of the title", () => {
        expect(songSearchText("(Everything I Do) I Do It For You", "Bryan Adams")).toBe(
            "(Everything I Do) I Do It For You Bryan Adams",
        );
    });

    it("uses the per-song fixes from spotify-overrides.json", () => {
        expect(songSearchText("Careless Whisper", "Wham! Featuring George Michael")).toBe(
            "Careless Whisper George Michael",
        );
        expect(songSearchText("Pick Up The Pieces", "AWB")).toBe("Pick Up The Pieces Average White Band");
    });
});

describe("searchTerms", () => {
    it("gives the cleaned title and lead artist separately, for the Spotify API query", () => {
        expect(searchTerms("Break Your Heart", "Taio Cruz Featuring Ludacris")).toEqual({
            title: "Break Your Heart",
            artist: "Taio Cruz",
        });
    });
});
