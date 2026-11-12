import { getHeroTitles, pickEvenly } from "../showcase";

describe("pickEvenly", () => {
    it("spreads picks across the whole list, starting with the first item", () => {
        expect(pickEvenly([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual([1, 3, 5, 7, 9]);
    });

    it("returns everything when asked for more than the list has", () => {
        expect(pickEvenly(["a", "b"], 5)).toEqual(["a", "b"]);
    });
});

describe("getHeroTitles", () => {
    it("returns the requested number of different #1 titles from across chart history", () => {
        const titles = getHeroTitles(30);

        expect(titles).toHaveLength(30);
        expect(new Set(titles).size).toBe(30);
        expect(titles[0]).toBe("Poor Little Fool");
    });
});
