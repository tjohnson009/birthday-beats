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

// the lines words make with a new line at each cut, and the cuts lines make
export const cutLines = (words: string[], cuts: number[]): string[] =>
    [0, ...cuts].map((a, m) => words.slice(a, cuts[m]).join(" "));
export const lineCuts = (lines: string[]): number[] => {
    let n = 0;
    return lines.slice(0, -1).map((l) => (n += l.split(" ").length));
};

// the parts of a title in ( ), [ ] or quotes, as the first and last word each one spans. one never closed runs to
// the last word, and one inside a single word can't break, so it's left out
type Part = { a: number; b: number };
function titleParts(words: string[]): Part[] {
    const open: { quote: boolean; a: number }[] = [];
    const parts: Part[] = [];
    // closes the latest open part of this kind, and any part still open inside it
    const close = (quote: boolean, b: number): boolean => {
        for (let k = open.length - 1; k >= 0; k--)
            if (open[k].quote === quote) {
                for (const p of open.splice(k)) parts.push({ a: p.a, b });
                return true;
            }
        return false;
    };
    words.forEach((w, i) => {
        for (const ch of w) {
            if (ch === "(" || ch === "[") open.push({ quote: false, a: i });
            else if (ch === ")" || ch === "]") close(false, i);
            else if (ch === "“") open.push({ quote: true, a: i });
            else if (ch === "”") close(true, i);
            // a straight quote closes an open one, or else opens one
            else if (ch === '"' && !close(true, i)) open.push({ quote: true, a: i });
        }
    });
    for (const p of open) parts.push({ a: p.a, b: words.length - 1 });
    return parts.filter((p) => p.b > p.a);
}

// whether lines that start at these cuts keep the parts whole. a part breaks only when it's too wide for a line of
// its own (fits(a, b) says whether words a to b - 1 fit on one line), and then it gets lines of its own: the first
// break comes right before it and the last right after it
const keeps = (parts: Part[], count: number, cuts: number[], fits: (a: number, b: number) => boolean): boolean => {
    const starts = new Set([0, count, ...cuts]);
    return parts.every(
        (p) =>
            !cuts.some((j) => p.a < j && j <= p.b) || (!fits(p.a, p.b + 1) && starts.has(p.a) && starts.has(p.b + 1)),
    );
};

// whether lines that start at these cuts keep every part of the title in ( ), [ ] or quotes whole (see keeps)
export const keepsParts = (words: string[], cuts: number[], fits: (a: number, b: number) => boolean): boolean =>
    keeps(titleParts(words), words.length, cuts, fits);

// a break right before a part or a quote reads well
const OPENS_PART = /^[([“"]/;

// the fewest lines, up to max, that keep every part of the title whole (see keeps). then the fewest awkward breaks,
// the most even split, and the most even of the other lines when a part sets the widest one. width(a, b) measures
// words a to b - 1 as one line. null if no split into max lines or fewer does
export function keptSplit(
    words: string[],
    max: number,
    width: (a: number, b: number) => number,
    lim: number,
    awkward: (j: number) => number = () => 0,
): (Split & { n: number }) | null {
    const parts = titleParts(words);
    const fits = (a: number, b: number): boolean => width(a, b) <= lim;
    const awk = (j: number): number => (OPENS_PART.test(words[j]) ? 0 : awkward(j));
    type Try = Split & { sq: number };
    const better = (x: Try, y: Try): boolean =>
        x.bad < y.bad || (x.bad === y.bad && (x.max < y.max - 0.01 || (x.max <= y.max + 0.01 && x.sq < y.sq - 0.01)));
    // every way to set words i onward on k lines. titles are a few words, so trying them all is cheap
    const splits = (i: number, k: number): Try[] => {
        if (k === 1) {
            const w = width(i, words.length);
            return w <= lim ? [{ bad: 0, max: w, sq: w * w, cuts: [] }] : [];
        }
        const out: Try[] = [];
        for (let j = i + 1; j <= words.length - k + 1; j++) {
            const w = width(i, j);
            if (w > lim) break;
            for (const r of splits(j, k - 1))
                out.push({ bad: r.bad + awk(j), max: Math.max(w, r.max), sq: r.sq + w * w, cuts: [j, ...r.cuts] });
        }
        return out;
    };
    for (let n = 1; n <= max; n++) {
        const all = splits(0, n).filter((s) => keeps(parts, words.length, s.cuts, fits));
        if (!all.length) continue;
        const { bad, max: widest, cuts } = all.reduce((x, y) => (better(y, x) ? y : x));
        return { bad, max: widest, cuts, n };
    }
    return null;
}
