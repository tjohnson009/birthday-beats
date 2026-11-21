import type { CSSProperties, ReactElement } from "react";
import LogoMark from "@/components/LogoMark";
import { SHARE_COLORS, type ShareColor } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";
import WIDTH_DATA from "./nowPlaying.widths.json";
import { contrast, mix, rgba, smartApostrophes, svgSrc, tableWidth } from "./shared";
import type { StoryCardDesign } from "./types";

// the Now playing picture: a record in a thin ring, the song under it, a player row, then the logo and link.
// next/og can't measure text, so lines are broken and sized here from a glyph width table, and every drawing is
// an svg image. that keeps it pixel for pixel with the now playing draft

const W = 1080;
const H = 1920;
const WHITE = "#FFFFFF";
const INK = "#0F1E2E";
const NIGHT = "#060A12";

// the lightest shade of c (mixed toward night) that reaches the ratio against the other color
const darkenUntil = (c: string, against: string, ratio: number): string => {
    for (let t = 0; t <= 1.0001; t += 0.01) {
        const d = mix(c, NIGHT, t);
        if (contrast(d, against) >= ratio) return d;
    }
    return NIGHT;
};

// layout, in px at 1080 x 1920
const MX = 96; // progress bar and controls run x 96 to 984
const CW = W - 2 * MX;
const TEXT_W = 800; // title and artist end at x 896, clear of TikTok's buttons
const HEAD_TOP = 266;
const HEAD_X = 90;
const HEAD_W = 900;
const HEAD_GAP = 2;
const DOTS_Y = 196; // decoration only, above the safe area
// bottom up: the link just under TikTok's button band and clear of its sound disc, the logo on top of it, and above
// that a 300 px band with no words in it, where the Music sticker can cover the drawn player row
const LINK_MAX = 72;
const LINK_H = 80;
const LINK_TOP = 1510;
const LINK_X = 140;
const LINK_W = 800;
const LOGO = 132;
const LOGO_RING = 7;
const LOGO_BOX = LOGO + 2 * LOGO_RING;
const LOGO_TOP = LINK_TOP - 8 - LOGO_BOX; // 1356 to 1502
const STICKER_TOP = LOGO_TOP - 4 - 300; // the sticker band, y 1052 to 1352
const TEXT_BOTTOM = STICKER_TOP - 6;
const BAR_H = 30;
const BAR_TOP = STICKER_TOP + 50;
const CTRL_H = 112;
const CTRL_TOP = BAR_TOP + BAR_H + 36;
// where the bright swatches turn pale, so white buttons stay on the rich color and the dark link on the pale part
const RICH_F = (CTRL_TOP + 40) / H;
const PALE_F = (LINK_TOP + LINK_H) / H;
const TITLE_GAP = 14;
// the label's sheen is brightest at (0.38, 0.34) and gone 0.75 away. the year starts 0.58 down, so this is the most
// sheen under it
const SHEEN = 0.16;
const SHEEN_AT_YEAR = SHEEN * (1 - (0.58 - 0.34) / 0.75);
const GLOW_R = 560;

// bright swatches ("split"): deep at the top, rich through the player row (white reads 5.6:1), pale under the logo
// and link. ink stays dark ("dark"), cream is light with ink text ("light"), and green, orange and pink keep their
// real color with ink text ("bright"). stops are fractions of the card height
type Theme = {
    mode: "light" | "dark" | "bright" | "split";
    stops: [number, string][];
    deep?: string;
    text: string;
    artist: string;
    icon: string;
    url: string;
    ring: string;
    pauseBars: string;
    label: string;
    labelText: string;
    glow: number | null;
};

function theme(key: ShareColor): Theme {
    const base = SHARE_COLORS[key];
    let T: Omit<Theme, "labelText">;
    if (key === "cream") {
        const sand = "#B89968";
        T = {
            mode: "light",
            stops: [
                [0, mix(base, sand, 0.52)],
                [RICH_F, mix(base, sand, 0.2)],
                [PALE_F, base],
                [1, mix(base, WHITE, 0.6)],
            ],
            text: INK,
            artist: mix(INK, base, 0.12),
            icon: INK,
            url: INK,
            ring: rgba(INK, 0.55),
            pauseBars: base,
            label: "#2F6BFF",
            glow: null,
        };
    } else if (key === "ink") {
        T = {
            mode: "dark",
            stops: [
                [0, "#04070C"],
                [RICH_F, base],
                [PALE_F, "#1A2F46"],
                [1, "#253F5C"],
            ],
            text: WHITE,
            artist: "#D6E0EA",
            icon: WHITE,
            url: WHITE,
            ring: rgba(WHITE, 0.85),
            pauseBars: base,
            label: "#16C79A",
            glow: 0.1,
        };
    } else if (key === "green" || key === "orange" || key === "pink") {
        // darken the top only as far as ink text still reads 5.2:1
        let top: string = base;
        for (let t = 0.01; t <= 0.25; t += 0.01) {
            const c = mix(base, NIGHT, t);
            if (contrast(INK, c) < 5.2) break;
            top = c;
        }
        T = {
            mode: "bright",
            deep: mix(base, NIGHT, 0.55),
            stops: [
                [0, top],
                [0.55, base],
                [PALE_F, mix(base, WHITE, 0.62)],
                [1, mix(base, WHITE, 0.85)],
            ],
            text: INK,
            artist: mix(INK, base, 0.06),
            icon: INK,
            url: INK,
            ring: rgba(WHITE, 0.95),
            pauseBars: base,
            label: base,
            glow: 0.16,
        };
    } else {
        const rich = darkenUntil(base, WHITE, 5.6);
        T = {
            mode: "split",
            deep: mix(rich, NIGHT, 0.5),
            stops: [
                [0, mix(rich, NIGHT, 0.5)],
                [RICH_F, rich],
                [PALE_F, mix(base, WHITE, 0.68)],
                [1, mix(base, WHITE, 0.87)],
            ],
            text: WHITE,
            artist: mix(WHITE, rich, 0.1),
            icon: WHITE,
            url: mix(rich, NIGHT, 0.55),
            ring: rgba(WHITE, 0.9),
            pauseBars: rich,
            label: base,
            glow: 0.12,
        };
    }
    // the year on the label is white or ink. white must still read 4.6:1 where the sheen is brightest under it, so
    // darken the label until it does (the sheen only helps ink)
    const labelText = contrast(WHITE, T.label) >= contrast(INK, T.label) ? WHITE : INK;
    let label = T.label;
    if (labelText === WHITE) {
        for (let t = 0; t <= 1.0001; t += 0.01) {
            const d = mix(T.label, NIGHT, t);
            if (contrast(WHITE, mix(d, WHITE, SHEEN_AT_YEAR)) >= 4.6) {
                label = d;
                break;
            }
        }
    } else if (contrast(INK, T.label) < 4.5) label = mix(T.label, WHITE, 0.3);
    return { ...T, label, labelText };
}

type WidthKey = keyof typeof WIDTH_DATA;
// glyph advances per 1000 px, measured in Chrome from the same TTF files
const WIDTHS: Record<WidthKey, Record<string, number>> = WIDTH_DATA;
type Face = { family: string; weight: 400 | 600 | 800; key: WidthKey };
const F: Record<"head" | "sub" | "title" | "artist" | "year" | "link", Face> = {
    head: { family: "Bricolage", weight: 800, key: "b800" },
    sub: { family: "Bricolage", weight: 600, key: "b600" },
    title: { family: "Bricolage", weight: 800, key: "b800" },
    artist: { family: "Bricolage", weight: 600, key: "b600" },
    year: { family: "Bricolage", weight: 800, key: "b800" },
    link: { family: "Limelight", weight: 400, key: "lime" },
};
const fontStyle = (f: Face, size: number): CSSProperties => ({
    fontFamily: f.family,
    fontWeight: f.weight,
    fontSize: size,
});

const measure = (text: string, f: Face, size: number, ls = 0): number => tableWidth(WIDTHS[f.key], text, size, ls);
// spare room so rounding never pushes a line past its box. the table has no kerning, which only ever tightens these
// fonts, so it runs wide
const SAFE = 0.985;

function greedy(words: string[], f: Face, size: number, maxW: number, ls = 0): string[] {
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (!cur || measure(t, f, size, ls) <= maxW * SAFE) cur = t;
        else {
            lines.push(cur);
            cur = w;
        }
    }
    lines.push(cur);
    return lines;
}

// same line count as greedy, but the lines as even as they can be, so no lone word is left hanging
function balanced(text: string, f: Face, size: number, maxW: number, ls = 0): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const g = greedy(words, f, size, maxW, ls);
    const n = g.length;
    if (n === 1 || words.length > 24) return g;
    const wid = (i: number, j: number) => measure(words.slice(i, j).join(" "), f, size, ls);
    type Split = { cost: number; cuts: number[] };
    const memo = new Map<string, Split>();
    const best = (i: number, k: number): Split => {
        const key = i + "," + k;
        const seen = memo.get(key);
        if (seen) return seen;
        let r: Split;
        if (k === 1) r = { cost: wid(i, words.length), cuts: [] };
        else {
            r = { cost: Infinity, cuts: [] };
            for (let j = i + 1; j <= words.length - (k - 1); j++) {
                const w = wid(i, j);
                if (w > maxW * SAFE) break;
                const rest = best(j, k - 1);
                const c = Math.max(w, rest.cost);
                if (c < r.cost) r = { cost: c, cuts: [j, ...rest.cuts] };
            }
        }
        memo.set(key, r);
        return r;
    };
    const b = best(0, n);
    if (!Number.isFinite(b.cost) || b.cost > maxW * SAFE) return g;
    const out: string[] = [];
    let s = 0;
    for (const c of [...b.cuts, words.length]) {
        out.push(words.slice(s, c).join(" "));
        s = c;
    }
    return out;
}

const widest = (lines: string[], f: Face, size: number, ls = 0): number =>
    Math.max(...lines.map((l) => measure(l, f, size, ls)));

// [size, most lines]
const TITLE_STEPS = [
    [112, 1],
    [104, 1],
    [96, 1],
    [88, 1],
    [96, 2],
    [88, 2],
    [80, 2],
    [72, 2],
    [72, 3],
    [64, 3],
    [56, 3],
    [50, 4],
    [44, 5],
] as const;
const ARTIST_STEPS = [
    [50, 1],
    [46, 1],
    [46, 2],
    [42, 2],
    [38, 3],
    [34, 3],
    [30, 4],
] as const;
// the heading's first line is the big one, the second line at least 40 px
const HEAD_STEPS = [62, 60, 58, 56, 52, 48, 44, 40];
const SUB_STEPS = [44, 42, 40, 36, 32, 28];
const LINK_STEPS = [72, 70, 68, 66, 64, 62, 60, 58, 56, 54, 52];
const LH = { title: 1.0, artist: 1.16, head: 1.12, sub: 1.2, link: LINK_H / LINK_MAX };
const tls = (size: number): number => -Math.round(size * 0.01);
const HEAD_LS = -0.5;
const LINK_LS = 0.5;

type Fit = { size: number; lines: string[] };

// one line at the largest step that fits. past the last step it wraps
function fitLine(text: string, f: Face, steps: number[], maxW: number, ls: number): Fit | null {
    if (!text) return null;
    for (const s of steps) if (measure(text, f, s, ls) <= maxW * SAFE) return { size: s, lines: [text] };
    const s = steps[steps.length - 1];
    return { size: s, lines: balanced(text, f, s, maxW, ls) };
}

function layout(card: ShareCard, color: ShareColor) {
    const T = theme(color);
    const title = smartApostrophes(card.title).trim();
    const artist = smartApostrophes(card.artist).trim();
    const year = card.year.trim();
    const head = fitLine(smartApostrophes(card.heading.trim()), F.head, HEAD_STEPS, HEAD_W, HEAD_LS);
    const sub = fitLine(smartApostrophes(card.subheading.trim()), F.sub, SUB_STEPS, HEAD_W, 0);
    const link = fitLine(card.link.trim(), F.link, LINK_STEPS, LINK_W, LINK_LS);
    const headH = head ? head.lines.length * Math.round(head.size * LH.head) : 0;
    const subH = sub ? sub.lines.length * Math.round(sub.size * LH.sub) : 0;
    const headBlock = headH + subH + (head && sub ? HEAD_GAP : 0);

    const vinylTop = headBlock ? HEAD_TOP + headBlock + 24 : 300;
    const DMAX = headBlock ? 476 : 540;
    const DMIN = 336;
    const GAP_V = 42;
    const room = TEXT_BOTTOM - vinylTop - GAP_V; // the record and the song text share this

    const artistFit = ((): Fit => {
        for (const [s, max] of ARTIST_STEPS) {
            const L = balanced(artist, F.artist, s, TEXT_W);
            if (L.length <= max && widest(L, F.artist, s) <= TEXT_W * SAFE) return { size: s, lines: L };
        }
        for (let s = 30; s >= 20; s -= 2) {
            const L = balanced(artist, F.artist, s, TEXT_W);
            if (widest(L, F.artist, s) <= TEXT_W * SAFE && L.length <= 5) return { size: s, lines: L };
        }
        return { size: 20, lines: balanced(artist, F.artist, 20, TEXT_W) };
    })();
    const artistH = artistFit.lines.length * Math.round(artistFit.size * LH.artist);

    const titleFit = ((): Fit & { h: number } => {
        for (const [s, max] of TITLE_STEPS) {
            const L = balanced(title, F.title, s, TEXT_W, tls(s));
            if (L.length > max || widest(L, F.title, s, tls(s)) > TEXT_W * SAFE) continue;
            const th = L.length * Math.round(s * LH.title);
            if (room - (th + TITLE_GAP + artistH) < DMIN) continue;
            return { size: s, lines: L, h: th };
        }
        // past the ladder (a very long title or one huge word): the largest size that fits the width and the room
        for (let s = 44; s >= 26; s -= 2) {
            const L = balanced(title, F.title, s, TEXT_W, tls(s));
            const th = L.length * Math.round(s * LH.title);
            if (widest(L, F.title, s, tls(s)) <= TEXT_W * SAFE && room - (th + TITLE_GAP + artistH) >= DMIN - 40) {
                return { size: s, lines: L, h: th };
            }
        }
        const L = balanced(title, F.title, 26, TEXT_W, tls(26));
        return { size: 26, lines: L, h: L.length * Math.round(26 * LH.title) };
    })();

    const textH = titleFit.h + TITLE_GAP + artistH;
    const D = Math.max(DMIN - 40, Math.min(DMAX, room - textH));
    // leftover room goes partly above the record and partly between the record and the text
    const spare = Math.max(0, room - textH - D);
    const vTop = Math.round(vinylTop + spare * 0.35);
    const textTop = Math.round(vTop + D + GAP_V + spare * 0.4);
    return { T, year, head, sub, link, headH, subH, titleFit, artistFit, artistH, D, vTop, textTop, textH };
}

// the drawings, as svg strings
function vinylSvg(D: number, T: Theme): string {
    const c = D / 2;
    const rDisc = c - Math.round(D * 0.058);
    const rLabel = Math.round(rDisc * 0.39);
    const hole = Math.max(6, Math.round(D * 0.016));
    const p = (r: number, a: number) => [(c + r * Math.cos(a)).toFixed(2), (c + r * Math.sin(a)).toFixed(2)];
    const wedge = (a0: number, a1: number, op: number) => {
        const [x0, y0] = p(rDisc - 3, a0);
        const [x1, y1] = p(rDisc - 3, a1);
        return `<path d="M${c} ${c}L${x0} ${y0}A${rDisc - 3} ${rDisc - 3} 0 0 1 ${x1} ${y1}Z" fill="#FFFFFF" fill-opacity="${op}"/>`;
    };
    let grooves = "";
    for (let r = rLabel + 12, i = 0; r < rDisc - 7; r += 7 + (i % 3) * 2, i++) {
        const strong = i % 5 === 2;
        grooves += `<circle cx="${c}" cy="${c}" r="${r.toFixed(1)}" fill="none" stroke="${strong ? "#3A3A42" : "#26262D"}" stroke-width="${strong ? 2.4 : 1.6}"/>`;
    }
    return [
        `<defs><radialGradient id="sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0.86" stop-color="#000" stop-opacity="0.32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`,
        `<radialGradient id="lb" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${SHEEN}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>`,
        `<circle cx="${c}" cy="${c}" r="${c - 2.5}" fill="none" stroke="${T.ring}" stroke-width="4"/>`,
        `<circle cx="${c}" cy="${c + Math.round(D * 0.02)}" r="${rDisc + Math.round(D * 0.03)}" fill="url(#sh)"/>`,
        `<circle cx="${c}" cy="${c}" r="${rDisc}" fill="#151519"/>`,
        `<circle cx="${c}" cy="${c}" r="${rDisc - 2}" fill="none" stroke="#2E2E36" stroke-width="3"/>`,
        grooves,
        wedge(-1.25, -0.62, 0.075),
        wedge(1.89, 2.52, 0.075),
        wedge(-0.5, -0.3, 0.04),
        wedge(2.64, 2.84, 0.04),
        `<circle cx="${c}" cy="${c}" r="${rLabel}" fill="${T.label}"/>`,
        `<circle cx="${c}" cy="${c}" r="${rLabel}" fill="url(#lb)"/>`,
        `<circle cx="${c}" cy="${c}" r="${(rLabel * 0.9).toFixed(1)}" fill="none" stroke="${rgba(T.labelText, 0.45)}" stroke-width="2"/>`,
        `<circle cx="${c}" cy="${c}" r="${hole}" fill="${T.deep || T.stops[0][1]}"/>`,
    ].join("");
}

function controlsSvg(T: Theme): string {
    const w = CW;
    const h = CTRL_H;
    const cy = h / 2;
    const ic = T.icon;
    const xs = [40, 224, w / 2, w - 224, w - 40];
    const g = (x: number, inner: string) => `<g transform="translate(${x - 30} ${cy - 30})">${inner}</g>`;
    const st = `fill="none" stroke="${ic}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"`;
    const shuffle = `<path d="M6 44H13C26 44 32 16 45 16H52" ${st}/><path d="M45 8L53 16L45 24" ${st}/><path d="M6 16H13C19 16 23 21 26 26" ${st}/><path d="M33 35C36 40 40 44 45 44H52" ${st}/><path d="M45 36L53 44L45 52" ${st}/>`;
    const prev = `<rect x="8" y="12" width="7" height="36" rx="3" fill="${ic}"/><path d="M52 13.5V46.5Q52 50 49 48.2L21 31.8Q18 30 21 28.2L49 11.8Q52 10 52 13.5Z" fill="${ic}"/>`;
    const next = `<g transform="translate(60 0) scale(-1 1)">${prev}</g>`;
    const repeat = `<path d="M8 32V27Q8 18 17 18H50" ${st}/><path d="M43 10L51 18L43 26" ${st}/><path d="M52 28V33Q52 42 43 42H10" ${st}/><path d="M17 34L9 42L17 50" ${st}/>`;
    const pause = `<circle cx="${xs[2]}" cy="${cy}" r="${h / 2 - 1}" fill="${ic}"/><rect x="${xs[2] - 18}" y="${cy - 22}" width="12" height="44" rx="4" fill="${T.pauseBars}"/><rect x="${xs[2] + 6}" y="${cy - 22}" width="12" height="44" rx="4" fill="${T.pauseBars}"/>`;
    return g(xs[0], shuffle) + g(xs[1], prev) + pause + g(xs[3], next) + g(xs[4], repeat);
}

function progressSvg(T: Theme): string {
    const w = CW;
    const cy = BAR_H / 2;
    const at = Math.round(w * 0.3);
    return (
        `<rect x="0" y="${cy - 5}" width="${w}" height="10" rx="5" fill="${T.icon}" fill-opacity="0.32"/>` +
        `<rect x="0" y="${cy - 5}" width="${at}" height="10" rx="5" fill="${T.icon}"/>` +
        `<circle cx="${at}" cy="${cy}" r="14" fill="${T.icon}"/>`
    );
}

const speakerSvg = (T: Theme): string =>
    `<path d="M5 21H17L33 8V52L17 39H5Q2 39 2 36V24Q2 21 5 21Z" fill="${T.icon}"/>` +
    `<path d="M42 21Q47 30 42 39" fill="none" stroke="${T.icon}" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M49 13Q59 30 49 47" fill="none" stroke="${T.icon}" stroke-width="4.6" stroke-linecap="round"/>`;

const dotsSvg = (T: Theme): string =>
    [9, 39, 69].map((x) => `<circle cx="${x}" cy="9" r="8.5" fill="${T.icon}" fill-opacity="0.9"/>`).join("");

const at = (x: number, y: number, w: number, h: number, extra: CSSProperties = {}): CSSProperties => ({
    display: "flex",
    position: "absolute",
    left: x,
    top: y,
    width: w,
    height: h,
    ...extra,
});

const svgImage = (key: string, w: number, h: number, inner: string, style: CSSProperties): ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element -- next/og draws this, not a browser
    <img key={key} alt="" src={svgSrc(w, h, inner)} width={w} height={h} style={style} />
);

// each line is its own no-wrap box: the lines are broken here, so next/og never wraps them on its own
const textLines = (fit: Fit, f: Face, lh: number, color: string, extra: CSSProperties = {}): ReactElement[] =>
    fit.lines.map((line, i) => (
        <div
            key={i}
            style={{
                display: "flex",
                ...fontStyle(f, fit.size),
                lineHeight: lh,
                height: Math.round(fit.size * lh),
                color,
                whiteSpace: "nowrap",
                ...extra,
            }}
        >
            {line}
        </div>
    ));

function draw(card: ShareCard, color: ShareColor): ReactElement {
    const L = layout(card, color);
    const { T, head, sub, link, titleFit, artistFit, D, vTop, textTop } = L;
    const kids: ReactElement[] = [];

    // a soft light behind the record
    if (T.glow) {
        const gy = vTop + D / 2;
        const top = Math.max(0, Math.round(gy - GLOW_R));
        const hh = Math.round(gy + GLOW_R) - top;
        const glow =
            `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${gy - top}" r="${GLOW_R}">` +
            `<stop offset="0" stop-color="#FFFFFF" stop-opacity="${T.glow}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>` +
            `<rect width="${W}" height="${hh}" fill="url(#g)"/>`;
        kids.push(svgImage("glow", W, hh, glow, at(0, top, W, hh)));
    }

    // three dots, up in Instagram's top bar where only art goes
    kids.push(svgImage("dots", 78, 18, dotsSvg(T), at(W - MX - 78 + 6, DOTS_Y - 9, 78, 18)));

    // the two heading lines, centered: the big one, then the smaller one in the artist's softer color
    if (head) {
        kids.push(
            <div
                key="heading"
                style={at(HEAD_X, HEAD_TOP, HEAD_W, L.headH, { flexDirection: "column", alignItems: "center" })}
            >
                {textLines(head, F.head, LH.head, T.text, { letterSpacing: HEAD_LS })}
            </div>,
        );
    }
    if (sub) {
        const top = HEAD_TOP + L.headH + (head ? HEAD_GAP : 0);
        kids.push(
            <div
                key="subheading"
                style={at(HEAD_X, top, HEAD_W, L.subH, { flexDirection: "column", alignItems: "center" })}
            >
                {textLines(sub, F.sub, LH.sub, T.artist, { letterSpacing: 0 })}
            </div>,
        );
    }

    // the record in its thin ring, and the year printed quietly on its label
    const vx = Math.round((W - D) / 2);
    kids.push(svgImage("vinyl", D, D, vinylSvg(D, T), at(vx, vTop, D, D)));
    const rDisc = D / 2 - Math.round(D * 0.058);
    const rLabel = Math.round(rDisc * 0.39);
    const yearSize = Math.max(28, Math.round(rLabel * 0.44));
    if (L.year) {
        const yearBox = at(
            vx + D / 2 - rLabel,
            Math.round(vTop + D / 2 + rLabel * 0.16),
            rLabel * 2,
            Math.round(yearSize * 1.3),
            { justifyContent: "center", alignItems: "center" },
        );
        kids.push(
            <div key="year" style={yearBox}>
                <div
                    style={{
                        display: "flex",
                        ...fontStyle(F.year, yearSize),
                        lineHeight: 1,
                        letterSpacing: 2,
                        color: T.labelText,
                        whiteSpace: "nowrap",
                    }}
                >
                    {L.year}
                </div>
            </div>,
        );
    }

    // the title (the biggest thing on the card) and the artist, left aligned
    kids.push(
        <div key="title" style={at(MX, textTop, TEXT_W, titleFit.h, { flexDirection: "column" })}>
            {textLines(titleFit, F.title, LH.title, T.text, { letterSpacing: tls(titleFit.size) })}
        </div>,
    );
    const artistTop = textTop + titleFit.h + TITLE_GAP;
    kids.push(
        <div key="artist" style={at(MX, artistTop, TEXT_W, L.artistH, { flexDirection: "column" })}>
            {textLines(artistFit, F.artist, LH.artist, T.artist)}
        </div>,
    );

    // a small speaker on the right, level with the middle of the song text (at most its first two title lines)
    const titleLH = Math.round(titleFit.size * LH.title);
    const blockMid = textTop + Math.min(L.textH, titleLH * 2 + 20) / 2;
    kids.push(svgImage("speaker", 62, 60, speakerSvg(T), at(W - MX - 62, Math.round(blockMid - 30), 62, 60)));

    kids.push(svgImage("progress", CW, BAR_H, progressSvg(T), at(MX, BAR_TOP, CW, BAR_H)));
    kids.push(svgImage("controls", CW, CTRL_H, controlsSvg(T), at(MX, CTRL_TOP, CW, CTRL_H)));

    // the logo on a white plate, so no swatch swallows its tile
    kids.push(
        <div
            key="logo"
            style={at((W - LOGO_BOX) / 2, LOGO_TOP, LOGO_BOX, LOGO_BOX, {
                backgroundColor: WHITE,
                borderRadius: Math.round(LOGO * 0.24) + LOGO_RING,
                alignItems: "center",
                justifyContent: "center",
                boxShadow: T.mode === "light" ? "0 10px 24px rgba(60,40,10,0.18)" : "0 12px 28px rgba(0,0,0,0.22)",
            })}
        >
            <LogoMark size={LOGO} />
        </div>,
    );

    if (link) {
        kids.push(
            <div
                key="link"
                style={at(LINK_X, LINK_TOP, LINK_W, LINK_H, {
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                })}
            >
                {textLines(link, F.link, LH.link, T.url, { letterSpacing: LINK_LS })}
            </div>,
        );
    }

    const gradient = `linear-gradient(180deg, ${T.stops.map(([f, c]) => `${c} ${(f * 100).toFixed(1)}%`).join(", ")})`;
    return (
        <div
            style={{
                display: "flex",
                position: "relative",
                width: W,
                height: H,
                overflow: "hidden",
                backgroundColor: T.stops[1][1],
                backgroundImage: gradient,
            }}
        >
            {kids}
        </div>
    );
}

const nowPlaying: StoryCardDesign = {
    fonts: [
        { name: "Bricolage", file: "BricolageGrotesque-SemiBold.ttf", weight: 600 },
        { name: "Bricolage", file: "BricolageGrotesque-ExtraBold.ttf", weight: 800 },
        { name: "Limelight", file: "Limelight-Regular.ttf", weight: 400 },
    ],
    draw,
};

export default nowPlaying;
