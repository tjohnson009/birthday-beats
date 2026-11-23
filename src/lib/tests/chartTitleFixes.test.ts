import { fixTitle } from "../../scripts/chartTitleFixes";
import numberOnes from "../../../data/number-ones.json";
import youtubeVideoEntries from "../../../data/youtube-videos.json";

describe("fixTitle", () => {
    it("fixes a title the chart source misspells", () => {
        expect(fixTitle('Kokomo (From"Cocktail" )', "The Beach Boys")).toBe('Kokomo (From "Cocktail")');
    });

    it("leaves other titles alone", () => {
        expect(fixTitle("Groovy Kind Of Love", "Phil Collins")).toBe("Groovy Kind Of Love");
        expect(fixTitle('Kokomo (From"Cocktail" )', "Someone Else")).toBe('Kokomo (From"Cocktail" )');
    });

    // a new fix goes into the saved files too: the site reads them as they are, and a stale video key would send
    // the song back to YouTube search on the next refresh
    it("leaves no misspelled titles in the saved data", () => {
        const misspelled = numberOnes.filter(({ song, artist }) => fixTitle(song, artist) !== song);
        const oldVideoKeys = Object.keys(youtubeVideoEntries).filter((key) => {
            const [song, artist] = key.split("|");
            return fixTitle(song, artist) !== song;
        });

        expect(misspelled).toEqual([]);
        expect(oldVideoKeys).toEqual([]);
    });
});
