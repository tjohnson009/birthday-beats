// a partial Fisher-Yates shuffle: every item is equally likely, and the original list is left alone
export const pickRandom = <T>(items: readonly T[], count: number, random: () => number = Math.random): T[] => {
    const pool = [...items];
    const picks = Math.min(count, pool.length);

    for (let i = 0; i < picks; i++) {
        const j = i + Math.floor(random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, picks);
};
