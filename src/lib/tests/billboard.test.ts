import { getNumberOneSongForDate } from "../billboard";
import NumberOneSongs from "../../../data/number-ones.json";

describe("getNumberOneSongForDate", () => {
    it("matches a mid-week birthday to the chart week containing it", () => {
        const result = getNumberOneSongForDate("1990-07-15");

        expect(result).toEqual({
            date: "1990-07-14",
            song: "Step By Step",
            artist: "New Kids On The Block",
        });
    });

    it("matches the right song for a Saturday release date", () => {
        const result = getNumberOneSongForDate("2021-05-01");

        expect(result).toEqual({
            date: "2021-05-01",
            song: "Rapstar",
            artist: "Polo G",
        });
    });

    it("returns proper for the 1962 top song gap", () => {
        const result = getNumberOneSongForDate("1962-01-03");

        expect(result).toEqual({
            date: "1961-12-25",
            song: "The Lion Sleeps Tonight",
            artist: "The Tokens",
        });
    });

    it("Returns null for pre-1958 music", () => {
        const result = getNumberOneSongForDate("1953-01-19");

        expect(result).toBeNull();
    });

    it("handles future dates", () => {
        const result = getNumberOneSongForDate("2999-03-26");

        expect(result).toEqual(NumberOneSongs[NumberOneSongs.length - 1]);
    });
});
