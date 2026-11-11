import numberOneSongs from "../../data/number-ones.json";

// a small, fixed sample of chart history for the hero's title wall.
// computed on the server so the 350 KB chart file never ships to the browser

// spread `count` picks evenly across the list, starting with the first item
export const pickEvenly = <T>(items: readonly T[], count: number): T[] => {
    if (count >= items.length) return [...items];

    const step = items.length / count;
    return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
};

export const getHeroTitles = (count = 36): string[] => {
    return pickEvenly([...new Set(numberOneSongs.map((week) => week.song))], count);
};
