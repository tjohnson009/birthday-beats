// helpers that work exactly the same in every card that uses them. anything a card does even a little
// differently (its color steps, its width table, its line breaking) stays in that card, so a change there can
// only move that card's pixels

// colors here are "#RRGGBB"
export const hx = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a: number[]): string =>
    "#" +
    a
        .map((v) =>
            Math.round(Math.max(0, Math.min(255, v)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")
        .toUpperCase();
export const mix = (a: string, b: string, t: number): string => {
    const A = hx(a);
    const B = hx(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
export const rgba = (h: string, a: number): string => {
    const [r, g, b] = hx(h);
    return `rgba(${r},${g},${b},${a})`;
};
// relative luminance and contrast ratio, as WCAG works them out
export const lum = (h: string): number => {
    const c = hx(h).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a: string, b: string): number => {
    const A = lum(a);
    const B = lum(b);
    return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};

// curly apostrophes: the width tables have them, and they read better big
export const smartApostrophes = (t: string): string => t.replace(/'/g, "’");

// a drawing built as an svg string, as an img src for next/og. the view box defaults to the drawn size
export const svgSrc = (w: number, h: number, inner: string, vbW = w, vbH = h): string =>
    "data:image/svg+xml;base64," +
    Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}">${inner}</svg>`,
        "utf8",
    ).toString("base64");

// a line's width from a glyph table (advances per 1000 px, __avg for a glyph it lacks), plus letter spacing after
// each glyph. no kerning
export const tableWidth = (w: Record<string, number>, text: string, size: number, ls = 0): number => {
    const avg = w.__avg || 560;
    let s = 0;
    let n = 0;
    for (const ch of text) {
        s += w[ch] !== undefined ? w[ch] : avg;
        n++;
    }
    return (s * size) / 1000 + ls * n;
};

// a good break comes before "(", "Featuring", "&", "With" and the like
export const GOOD_BREAK_BEFORE = /^(\(|featuring$|feat\.$|ft\.$|with$|&$|and$|x$|duet$)/i;

export type Split = { bad: number; max: number; cuts: number[] };

// where to break `count` words into lines no wider than `lim`: the fewest lines, then the fewest awkward breaks,
// then the most even split, so no lone word hangs at the end. width(a, b) measures words a to b - 1 as one line and
// awkward(j) is 1 when a break before word j reads badly. null if one word alone is too wide
export function splitLines(
    count: number,
    width: (a: number, b: number) => number,
    awkward: (j: number) => number,
    lim: number,
): (Split & { n: number }) | null {
    for (let i = 0; i < count; i++) if (width(i, i + 1) > lim) return null;
    // the fewest lines is what filling each line in turn gives
    let n = 1;
    let cur = 0;
    for (let i = 1; i < count; i++)
        if (width(cur, i + 1) > lim) {
            n++;
            cur = i;
        }
    const better = (x: Split, y: Split): boolean => x.bad < y.bad || (x.bad === y.bad && x.max < y.max - 0.01);
    const memo = new Map<string, Split>();
    // words i onward in k lines
    const best = (i: number, k: number): Split => {
        const key = i + "," + k;
        const seen = memo.get(key);
        if (seen) return seen;
        let r: Split;
        if (k === 1) r = { bad: 0, max: width(i, count), cuts: [] };
        else {
            r = { bad: Infinity, max: Infinity, cuts: [] };
            for (let j = i + 1; j <= count - k + 1; j++) {
                const first = width(i, j);
                if (first > lim) break;
                const rest = best(j, k - 1);
                if (rest.max > lim) continue;
                const c = { bad: rest.bad + awkward(j), max: Math.max(first, rest.max), cuts: [j, ...rest.cuts] };
                if (better(c, r)) r = c;
            }
        }
        memo.set(key, r);
        return r;
    };
    return { n, ...best(0, n) };
}
