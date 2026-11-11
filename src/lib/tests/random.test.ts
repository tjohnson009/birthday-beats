import { pickRandom } from "../random";

describe("pickRandom", () => {
    it("returns the requested number of different items from the list", () => {
        const picks = pickRandom([1, 2, 3, 4, 5, 6, 7, 8], 3);

        expect(picks).toHaveLength(3);
        expect(new Set(picks).size).toBe(3);
        picks.forEach((n) => expect(n).toBeGreaterThanOrEqual(1));
    });

    it("uses the random source it is given, so picks can be repeated in tests", () => {
        expect(pickRandom(["a", "b", "c", "d"], 2, () => 0)).toEqual(["a", "b"]);
    });

    it("returns everything, shuffled, when asked for more than the list has", () => {
        expect(pickRandom(["x", "y"], 5).sort()).toEqual(["x", "y"]);
    });

    it("leaves the original list alone", () => {
        const list = [1, 2, 3];
        pickRandom(list, 2);

        expect(list).toEqual([1, 2, 3]);
    });
});
