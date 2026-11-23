import type { CSSProperties, ReactElement } from "react";
import LogoMark from "@/components/LogoMark";
import { SHARE_COLORS, type ShareColor } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";
import WIDTHS from "./record.widths.json";
import {
    contrast,
    cutLines,
    keepsParts,
    keptSplit,
    lineCuts,
    lum,
    mix,
    rgba,
    smartApostrophes,
    svgSrc,
} from "./shared";
import type { StoryCardDesign } from "./types";

// the Record picture: linen in a light wash of the color, the two heading lines, the logo and link, a vinyl
// record with the year on its label, the title in pixel capitals, the artist, and a player bar. it matches the
// record draft element for element, so its numbers and svg strings stay as the draft has them

const W = 1080;
const H = 1920;
const LINEN = "#F1EBDF";
const NIGHT = "#08090C";

// the lightest shade of c (mixed toward near black) that reaches the target contrast on bg
const shade = (c: string, bg: string, target: number): string => {
    for (let t = 0; t <= 1.0001; t += 0.02) {
        const m = mix(c, NIGHT, t);
        if (contrast(m, bg) >= target) return m;
    }
    return NIGHT;
};
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString();

type Theme = {
    dark: boolean;
    bg: string;
    text: string;
    deep: string;
    sub: string;
    pop: string;
    titleShadow: string;
    label: string;
    labelText: string;
    playFill: string;
    playIcon: string;
    hi: string;
    hiOp: number;
    lo: string;
    loOp: number;
    rim: number;
    shadow: string;
};

// the linen takes a light wash of the color, the label and player accents the full color, and the words a deep
// shade of it. ink flips to dark linen, and cream keeps the plain linen with a gold label
function theme(key: ShareColor): Theme {
    const c = SHARE_COLORS[key];
    if (key === "ink") {
        const text = "#F3ECDF";
        return {
            dark: true,
            bg: "#0F1E2E",
            text,
            deep: text,
            sub: "#7FE0C4",
            pop: "#F3ECDF",
            titleShadow: "#2F6BFF",
            label: "#F3ECDF",
            labelText: "#0F1E2E",
            playFill: "#F3ECDF",
            playIcon: "#0F1E2E",
            hi: "#FFFFFF",
            hiOp: 0.035,
            lo: "#000000",
            loOp: 0.22,
            rim: 0.22,
            shadow: "rgba(0,0,0,0.55)",
        };
    }
    if (key === "cream") {
        const text = "#17181C";
        return {
            dark: false,
            bg: LINEN,
            text,
            deep: text,
            sub: "#62471F",
            pop: text,
            titleShadow: "#D8C29B",
            label: "#C9A15E",
            labelText: "#17181C",
            playFill: text,
            playIcon: LINEN,
            hi: "#FFFFFF",
            hiOp: 0.22,
            lo: "#5A4A2E",
            loOp: 0.075,
            rim: 0.12,
            shadow: "rgba(40,30,15,0.30)",
        };
    }
    const bg = mix("#F7F2E9", c, 0.3);
    const deep = shade(c, bg, 9);
    const sub = shade(c, bg, 6.4);
    // the color itself unless it washes out on the linen
    const pop = shade(c, bg, 2.6);
    // the year goes on the label in white or a dark shade of the color, whichever reaches 5.2:1. only if neither
    // does is the label darkened, a step at a time
    let label: string = c;
    let labelText = "#FFFFFF";
    for (let t = 0; t <= 0.5; t += 0.02) {
        label = mix(c, NIGHT, t);
        if (contrast("#FFFFFF", label) >= 5.2) {
            labelText = "#FFFFFF";
            break;
        }
        const dark = shade(c, label, 5.2);
        if (contrast(dark, label) >= 5.2) {
            labelText = dark;
            break;
        }
    }
    const playIcon = contrast("#FFFFFF", pop) >= 3 ? "#FFFFFF" : deep;
    return {
        dark: false,
        bg,
        text: deep,
        deep,
        sub,
        pop,
        titleShadow: mix(c, bg, 0.1),
        label,
        labelText,
        playFill: pop,
        playIcon,
        hi: "#FFFFFF",
        hiOp: 0.2,
        lo: mix(c, NIGHT, 0.6),
        loOp: 0.07,
        rim: 0.12,
        shadow: rgba(mix(c, NIGHT, 0.75), 0.32),
    };
}

// advance widths in thousandths of an em, measured from the real font files. lookups instead of measuring, so the
// lines break the same everywhere
type Face = { family: string; weight: number; w: Record<string, number>; avg: number };

const table = (widths: number[]): Record<string, number> => {
    const m: Record<string, number> = {};
    [...WIDTHS.chars].forEach((ch, i) => {
        m[ch] = widths[i];
    });
    return m;
};
const FONTS = {
    pixel: { family: "Jersey10", weight: 400, w: table(WIDTHS.jersey), avg: 470 },
    round: { family: "Righteous", weight: 400, w: table(WIDTHS.righteous), avg: 640 },
    semi: { family: "Bricolage", weight: 600, w: table(WIDTHS.bricolage600), avg: 660 },
    xbold: { family: "Bricolage", weight: 800, w: table(WIDTHS.bricolage800), avg: 680 },
} satisfies Record<string, Face>;
const HEAD_F = FONTS.xbold;
const SUB_F = FONTS.semi;
const ARTIST_F = FONTS.semi;
const LINK_F = FONTS.round;

const textW = (s: string, f: Face, size: number, ls = 0): number => {
    let u = 0;
    let n = 0;
    for (const ch of s) {
        u += f.w[ch] ?? f.avg;
        n++;
    }
    return (u / 1000) * size + ls * Math.max(0, n - 1);
};
// spare room, so a renderer that rounds a little differently never wraps a line we built
const SAFE = 0.96;

// breaksPart: the lines break inside a part of the text in ( ), [ ] or quotes (see keepsParts)
type Lines = { lines: string[]; widest: number; breaksPart?: boolean };
type Fit = Lines & { size: number; wrapped?: boolean; overflow?: boolean };

// the fewest lines that fit, then the most even split for that many lines, so no lone word hangs at the end
function breakLines(text: string, f: Face, size: number, ls: number, maxW: number, maxLines: number): Lines | null {
    const words = text.split(/\s+/).filter(Boolean);
    const n = words.length;
    const lim = maxW * SAFE;
    if (!n) return { lines: [""], widest: 0 };
    const width = (i: number, j: number) => textW(words.slice(i, j).join(" "), f, size, ls);
    for (let k = 1; k <= Math.min(maxLines, n); k++) {
        // best[m][j]: the smallest widest line when the first j words fill m lines
        const best = Array.from({ length: k + 1 }, () => Array<number>(n + 1).fill(Infinity));
        const cut = Array.from({ length: k + 1 }, () => Array<number>(n + 1).fill(-1));
        best[0][0] = 0;
        for (let m = 1; m <= k; m++) {
            for (let j = 1; j <= n; j++) {
                for (let i = m - 1; i < j; i++) {
                    const v = Math.max(best[m - 1][i], width(i, j));
                    if (v < best[m][j]) {
                        best[m][j] = v;
                        cut[m][j] = i;
                    }
                }
            }
        }
        if (best[k][n] <= lim) {
            const lines: string[] = [];
            let j = n;
            for (let m = k; m >= 1; m--) {
                const i = cut[m][j];
                lines.unshift(words.slice(i, j).join(" "));
                j = i;
            }
            const breaksPart = !keepsParts(words, lineCuts(lines), (a, b) => width(a, b) <= lim);
            return { lines, widest: best[k][n], breaksPart };
        }
    }
    return null;
}

// the fewest lines, up to maxLines, that keep the text's parts in ( ), [ ] or quotes whole. null if none do
function keptLines(text: string, f: Face, size: number, ls: number, maxW: number, maxLines: number): Lines | null {
    const words = text.split(/\s+/).filter(Boolean);
    const width = (i: number, j: number) => textW(words.slice(i, j).join(" "), f, size, ls);
    const r = keptSplit(words, maxLines, width, maxW * SAFE);
    return r && { lines: cutLines(words, r.cuts), widest: r.max };
}

// one line at the biggest step that fits. past the last step it wraps at the smallest size rather than cut
function fitLine(text: string, f: Face, steps: number[], maxW: number, ls = 0): Fit {
    for (const s of steps) {
        const r = breakLines(text, f, s, ls, maxW, 1);
        if (r) return { size: s, ...r };
    }
    const s = steps[steps.length - 1];
    const r = breakLines(text, f, s, ls, maxW, 3);
    return r
        ? { size: s, ...r, wrapped: true }
        : { size: s, lines: [text], widest: textW(text, f, s, ls), overflow: true };
}

// [size, max lines]. the title takes the biggest step that fits, the artist stays small
const TITLE_STEPS: [number, number][] = [
    [150, 2],
    [136, 2],
    [122, 2],
    [110, 3],
    [100, 3],
    [90, 3],
    [80, 4],
    [72, 4],
    [64, 4],
    [56, 5],
];
const ARTIST_STEPS: [number, number][] = [
    [50, 1],
    [46, 1],
    [42, 1],
    [44, 2],
    [40, 2],
    [36, 3],
    [32, 3],
    [28, 4],
];
const HEAD_STEPS = [62, 60, 58, 56];
const SUB_STEPS = [46, 44, 42, 40];
const LINK_STEPS = [64, 60, 56, 52];
const LH = { title: 0.88, artist: 1.16, head: 1.12, sub: 1.16, link: 1.1 };
const GAP = { sub: 4, artist: 16 };
const LINK_LS = 0.5;
const titleLS = (size: number): number => Math.round(size * 0.02);
const titleShadow = (size: number): number => Math.max(3, Math.round(size * 0.045));

// y on the 1080x1920 story. Instagram covers y < 250 and y > 1650, and TikTok's buttons sit on the right in y 750 to
// 1500, so words stay in x 80 to 1000 and y 260 to 1600, and left of x 940 in y 750 to 1500
const L = {
    head: { top: 264, h: 126, w: 900 },
    logoTop: 422,
    logo: 116,
    plate: 8,
    linkGap: 24,
    rowW: 920,
    // the label radius is a share of the record radius
    rec: { cx: 540, cy: 810, d: 476, label: 0.38 },
    notes: { left: 792, top: 540 },
    // Jersey 10 draws its line box up to 18 px above the line height at 150 px, so the title starts 22 px under
    // the Music sticker room (x 190 to 890, y 866 to 1166, over the lower part of the record, no words in it)
    text: { x: 140, w: 800, top: 1188, bottom: 1512 },
    player: { gap: 10, h: 128 },
};

function fitText(title: string, artist: string): { title: Fit; artist: Fit; used: number } {
    const box = L.text.bottom - L.text.top;
    const w = L.text.w;
    const titles: Fit[] = [];
    const artists: Fit[] = [];
    for (const [s, n] of TITLE_STEPS) {
        const r = breakLines(title, FONTS.pixel, s, titleLS(s), w - titleShadow(s), n);
        if (r) titles.push({ size: s, ...r });
    }
    for (const [s, n] of ARTIST_STEPS) {
        const r = breakLines(artist, ARTIST_F, s, 0, w, n);
        if (r) artists.push({ size: s, ...r });
    }
    if (!titles.length)
        titles.push({ size: 56, lines: [title], widest: textW(title, FONTS.pixel, 56), overflow: true });
    if (!artists.length) {
        artists.push({ size: 28, lines: [artist], widest: textW(artist, ARTIST_F, 28), overflow: true });
    }
    const tH = (t: Fit) => t.lines.length * Math.round(t.size * LH.title) + titleShadow(t.size);
    const aH = (a: Fit) => a.lines.length * Math.round(a.size * LH.artist);
    // the artist stays 38 px or more if any title size allows it, then 34, then 30: a long credit costs the title a
    // step or two before the artist gets too small to read on a phone
    const pick = (choices: Fit[]) => {
        for (const floor of [38, 34, 30, 0]) {
            for (const t of choices) {
                for (const a of artists) {
                    if (a.size < floor) continue;
                    const used = tH(t) + GAP.artist + aH(a);
                    if (used <= box) return { title: t, artist: a, used };
                }
            }
        }
        return null;
    };
    const fit = pick(titles);
    // a title that breaks inside a part in ( ), [ ] or quotes takes the biggest step that keeps its parts whole
    if (fit?.title.breaksPart) {
        const kept: Fit[] = [];
        for (const [s, n] of TITLE_STEPS) {
            const r = keptLines(title, FONTS.pixel, s, titleLS(s), w - titleShadow(s), n);
            if (r) kept.push({ size: s, ...r });
        }
        return pick(kept) ?? fit;
    }
    if (fit) return fit;
    const t = titles[titles.length - 1];
    const a = artists[artists.length - 1];
    return { title: t, artist: a, used: tH(t) + GAP.artist + aH(a) };
}

// next/og draws these svg pictures straight into the png: next/image and alt text don't apply
const svgImage = (w: number, h: number, inner: string, style: CSSProperties): ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={svgSrc(w, h, inner)} width={w} height={h} style={{ display: "flex", ...style }} />
);

// basket weave: an 8 px tile of thread crossings, plus three odd-size tiles of faint uneven threads so no repeat
// shows. all vector and periodic, so the png stays small
function linen(th: Theme): ReactElement {
    const { bg, hi, hiOp, lo, loOp } = th;
    const H1 = hiOp * 1.5;
    const L1 = loOp * 1.7;
    const hThread = (x: number, y: number) =>
        `<rect x="${x + 0.3}" y="${y + 0.7}" width="3.4" height="2.4" rx="1.2" fill="${hi}" fill-opacity="${H1}"/>` +
        `<rect x="${x}" y="${y + 3.2}" width="4" height="0.8" fill="${lo}" fill-opacity="${L1}"/>`;
    const vThread = (x: number, y: number) =>
        `<rect x="${x + 0.7}" y="${y + 0.3}" width="2.4" height="3.4" rx="1.2" fill="${hi}" fill-opacity="${H1 * 0.7}"/>` +
        `<rect x="${x + 3.2}" y="${y}" width="0.8" height="4" fill="${lo}" fill-opacity="${L1}"/>`;
    // seeded, so every render draws the same threads
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const slubTile = (tw: number, tileH: number, n: number) => {
        let out = "";
        for (let i = 0; i < n; i++) {
            const horiz = rnd() < 0.65;
            const len = 8 + rnd() * 26;
            const x = Math.floor(rnd() * tw);
            const y = Math.floor(rnd() * tileH);
            const light = rnd() < 0.5;
            const fill = light ? hi : lo;
            const op = (light ? hiOp * 0.8 : loOp * 0.9) * (0.5 + rnd() * 0.6);
            const t = f1(1.4 + rnd() * 1.2);
            out += horiz
                ? `<rect x="${x}" y="${y}" width="${f1(len)}" height="${t}" rx="1" fill="${fill}" fill-opacity="${op.toFixed(3)}"/>`
                : `<rect x="${x}" y="${y}" width="${t}" height="${f1(len * 0.6)}" rx="1" fill="${fill}" fill-opacity="${op.toFixed(3)}"/>`;
        }
        return out;
    };
    const slubs = [
        [211, 137, 9],
        [293, 179, 10],
        [367, 251, 12],
    ]
        .map(
            ([tw, tileH, n], i) =>
                `<pattern id="sl${i}" width="${tw}" height="${tileH}" patternUnits="userSpaceOnUse">${slubTile(tw, tileH, n)}</pattern>`,
        )
        .join("");
    const fillAll = (fill: string) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
    return svgImage(
        W,
        H,
        "<defs>" +
            `<pattern id="bw" width="8" height="8" patternUnits="userSpaceOnUse">${hThread(0, 0)}${vThread(4, 0)}${vThread(0, 4)}${hThread(4, 4)}</pattern>` +
            slubs +
            `<radialGradient id="vg" cx="0.5" cy="0.42" r="0.75"><stop offset="0.55" stop-color="${lo}" stop-opacity="0"/><stop offset="1" stop-color="${lo}" stop-opacity="${th.dark ? 0.35 : 0.12}"/></radialGradient>` +
            "</defs>" +
            fillAll(bg) +
            fillAll("url(#bw)") +
            fillAll("url(#sl0)") +
            fillAll("url(#sl1)") +
            fillAll("url(#sl2)") +
            fillAll("url(#vg)"),
        { position: "absolute", left: 0, top: 0, width: W, height: H },
    );
}

// a ring slice between radii r0 and r1, centered on angle a (degrees, 0 = +x, clockwise), hw degrees each side
function wedge(cx: number, cy: number, r0: number, r1: number, a: number, hw: number): string {
    const rad = (d: number) => (d * Math.PI) / 180;
    const p = (r: number, d: number) => `${f1(cx + r * Math.cos(rad(d)))} ${f1(cy + r * Math.sin(rad(d)))}`;
    const large = hw * 2 > 180 ? 1 : 0;
    return `M${p(r1, a - hw)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a + hw)}L${p(r0, a + hw)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a - hw)}Z`;
}

function record(th: Theme, d: number): ReactElement {
    const R = d / 2;
    const c = R;
    const rl = R * L.rec.label;
    // fine grooves with slightly varying brightness, and a few dark gaps between the tracks
    let grooves = "";
    const tracks = [0.52, 0.64, 0.75, 0.86];
    for (let r = rl + R * 0.05; r < R * 0.965; r += 3.2) {
        const k = r / R;
        const gap = tracks.some((t) => Math.abs(k - t) < 0.006);
        const op = gap ? 0.0 : 0.05 + 0.045 * Math.abs(Math.sin(r * 0.7));
        if (op > 0) {
            grooves += `<circle cx="${c}" cy="${c}" r="${f1(r)}" fill="none" stroke="#FFFFFF" stroke-opacity="${op.toFixed(3)}" stroke-width="1.1"/>`;
        }
    }
    for (const t of tracks) {
        grooves += `<circle cx="${c}" cy="${c}" r="${f1(R * t)}" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="3"/>`;
    }
    // shine: stacked soft wedges, strong at upper left and lower right, faint on the other two sides
    let shine = "";
    const band = (a: number, peak: number, spread: number) => {
        const N = 18;
        for (let i = 1; i <= N; i++) {
            shine += `<path d="${wedge(c, c, rl + R * 0.03, R * 0.985, a, (i / N) * spread)}" fill="#FFFFFF" fill-opacity="${(peak / N).toFixed(4)}"/>`;
        }
    };
    band(222, 0.42, 26);
    band(42, 0.36, 24);
    band(140, 0.08, 16);
    band(318, 0.08, 16);
    // the label's rings take the opposite tone to the year, so a ring crossing it never lowers its contrast
    const ringStroke = lum(th.labelText) > 0.4 ? "#000000" : "#FFFFFF";
    return svgImage(
        d,
        d,
        "<defs>" +
            `<radialGradient id="vin" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#1C1C20"/><stop offset="0.9" stop-color="#101013"/><stop offset="1" stop-color="#050506"/></radialGradient>` +
            `<radialGradient id="lab" cx="0.38" cy="0.32" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.07"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.16"/></radialGradient>` +
            "</defs>" +
            `<circle cx="${c}" cy="${c}" r="${R}" fill="url(#vin)"/>` +
            grooves +
            shine +
            `<circle cx="${c}" cy="${c}" r="${R - 1.5}" fill="none" stroke="#FFFFFF" stroke-opacity="${th.rim}" stroke-width="3"/>` +
            `<circle cx="${c}" cy="${c}" r="${f1(rl + R * 0.03)}" fill="#0B0B0D"/>` +
            `<circle cx="${c}" cy="${c}" r="${f1(rl)}" fill="${th.label}"/>` +
            `<circle cx="${c}" cy="${c}" r="${f1(rl)}" fill="url(#lab)"/>` +
            `<circle cx="${c}" cy="${c}" r="${f1(rl * 0.9)}" fill="none" stroke="${ringStroke}" stroke-opacity="0.35" stroke-width="2.5"/>` +
            `<circle cx="${c}" cy="${c}" r="${f1(rl * 0.3)}" fill="none" stroke="${ringStroke}" stroke-opacity="0.3" stroke-width="2"/>` +
            `<circle cx="${c}" cy="${c}" r="9" fill="${th.bg}"/>` +
            `<circle cx="${c}" cy="${c}" r="9" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="1.5"/>`,
        {},
    );
}

// an eighth note on top, a beamed pair on the left, a sixteenth on the right
function notes(th: Theme): ReactElement {
    const col = th.pop;
    const head = (x: number, y: number, s = 1) =>
        `<ellipse cx="${x}" cy="${y}" rx="${15 * s}" ry="${11 * s}" transform="rotate(-24 ${x} ${y})" fill="${col}"/>`;
    const eighth =
        head(112, 92) +
        `<rect x="124" y="14" width="5" height="80" rx="2" fill="${col}"/>` +
        `<path d="M126 14C130 30 160 38 154 70C152 56 140 46 128 44Z" fill="${col}"/>`;
    const beamed =
        head(26, 196) +
        head(84, 186) +
        `<rect x="37.5" y="118" width="5" height="78" rx="2" fill="${col}"/>` +
        `<rect x="95.5" y="108" width="5" height="78" rx="2" fill="${col}"/>` +
        `<path d="M37.5 118L100.5 106V121L37.5 133Z" fill="${col}"/>`;
    const six =
        head(172, 206) +
        `<rect x="184" y="128" width="5" height="80" rx="2" fill="${col}"/>` +
        `<path d="M186 128C190 142 216 148 210 176C208 164 198 156 188 154Z" fill="${col}"/>` +
        `<path d="M186 148C190 162 216 168 210 196C208 184 198 176 188 174Z" fill="${col}"/>`;
    return svgImage(230, 230, eighth + beamed + six, { position: "absolute", left: L.notes.left, top: L.notes.top });
}

// a progress line 60% along, then share, back, play, forward, and like
function player(th: Theme, top: number): ReactElement {
    const h = L.player.h;
    const col = th.deep;
    const cy = h - 42;
    const x0 = 190;
    const x1 = 890;
    const xp = x0 + (x1 - x0) * 0.6;
    const track =
        `<rect x="${x0}" y="20" width="${x1 - x0}" height="5" rx="2.5" fill="${col}" fill-opacity="0.32"/>` +
        `<rect x="${x0}" y="16.5" width="${f1(xp - x0)}" height="12" rx="6" fill="${th.pop}"/>` +
        `<circle cx="${f1(xp)}" cy="22.5" r="17" fill="${th.pop}"/>`;
    const play =
        `<circle cx="540" cy="${cy}" r="42" fill="${th.playFill}"/>` +
        `<path d="M529 ${cy - 19}L556 ${cy}L529 ${cy + 19}Z" fill="${th.playIcon}" stroke="${th.playIcon}" stroke-width="5" stroke-linejoin="round"/>`;
    const tri = (x: number, dir: number) =>
        `<path d="M${x} ${cy - 19}L${x + dir * 26} ${cy}L${x} ${cy + 19}Z" fill="${col}" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`;
    const rew = tri(398, -1) + tri(424, -1);
    const ff = tri(656, 1) + tri(682, 1);
    const share =
        `<g stroke="${col}" stroke-width="5" stroke-linecap="round"><path d="M296 ${cy}L322 ${cy - 16}M296 ${cy}L322 ${cy + 16}"/></g>` +
        `<circle cx="296" cy="${cy}" r="8" fill="${col}"/>` +
        `<circle cx="322" cy="${cy - 17}" r="8" fill="${col}"/>` +
        `<circle cx="322" cy="${cy + 17}" r="8" fill="${col}"/>`;
    const heart = `<path d="M786 ${cy + 15}C772 ${cy + 4} 762 ${cy - 3} 762 ${cy - 11}C762 ${cy - 19} 768 ${cy - 24} 775 ${cy - 24}C780 ${cy - 24} 784 ${cy - 21} 786 ${cy - 17}C788 ${cy - 21} 792 ${cy - 24} 797 ${cy - 24}C804 ${cy - 24} 810 ${cy - 19} 810 ${cy - 11}C810 ${cy - 3} 800 ${cy + 4} 786 ${cy + 15}Z" fill="${col}"/>`;
    return svgImage(W, h, track + share + rew + play + ff + heart, { position: "absolute", left: 0, top });
}

// every line is its own nowrap row, so next/og breaks exactly where the width tables did
const line = (key: number, w: number, style: CSSProperties, text: string): ReactElement => (
    <div key={key} style={{ display: "flex", width: w, justifyContent: "center", whiteSpace: "nowrap", ...style }}>
        {text}
    </div>
);

function draw(card: ShareCard, color: ShareColor): ReactElement {
    const th = theme(color);
    const heading = card.heading.trim();
    const subheading = card.subheading.trim();
    const title = smartApostrophes(card.title).toUpperCase();
    const artist = smartApostrophes(card.artist);
    const fit = fitText(title, artist);
    const head = heading ? fitLine(heading, HEAD_F, HEAD_STEPS, L.head.w) : null;
    // an empty subheading drops that line
    const sub = subheading ? fitLine(subheading, SUB_F, SUB_STEPS, L.head.w) : null;
    const plateW = L.logo + 2 * L.plate;
    const link = fitLine(card.link.trim(), LINK_F, LINK_STEPS, L.rowW - plateW - L.linkGap, LINK_LS);
    const { rec } = L;
    const recLeft = rec.cx - rec.d / 2;
    const recTop = rec.cy - rec.d / 2;

    // the year sits in the label's upper half, sized to the label so it never reaches the vinyl
    const rl = (rec.d / 2) * rec.label;
    const ySize = Math.round(rl * 0.62);
    const yMid = rec.cy - rl * 0.47;

    // the title and artist hang from under the sticker room and the player follows them, so a short credit never
    // leaves a gap under the record. spare room ends up at the bottom, under Instagram's reply bar
    const ts = fit.title.size;
    const sh = titleShadow(ts);
    const as = fit.artist.size;
    const playerTop = L.text.top + Math.min(fit.used, L.text.bottom - L.text.top) + L.player.gap;

    return (
        <div
            style={{
                display: "flex",
                position: "relative",
                width: W,
                height: H,
                backgroundColor: th.bg,
                overflow: "hidden",
            }}
        >
            {linen(th)}
            {notes(th)}
            {/* the record's shadow */}
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: recLeft + 10,
                    top: recTop + 18,
                    width: rec.d - 20,
                    height: rec.d - 20,
                    borderRadius: rec.d,
                    backgroundColor: th.dark ? "#000000" : "rgba(0,0,0,0.01)",
                    boxShadow: th.dark ? "0 24px 60px rgba(0,0,0,0.7)" : `0 26px 54px ${th.shadow}`,
                }}
            />
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: recLeft,
                    top: recTop,
                    width: rec.d,
                    height: rec.d,
                }}
            >
                {record(th, rec.d)}
            </div>
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: rec.cx - 110,
                    top: Math.round(yMid - ySize * 0.45),
                    width: 220,
                    height: Math.round(ySize * 0.9),
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: "Jersey10",
                    fontSize: ySize,
                    lineHeight: `${Math.round(ySize * 0.9)}px`,
                    color: th.labelText,
                    letterSpacing: 2,
                }}
            >
                {card.year}
            </div>

            {/* the two heading lines, centered in a fixed band so the logo row never moves */}
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: (W - L.head.w) / 2,
                    top: L.head.top,
                    width: L.head.w,
                    height: L.head.h,
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {head && (
                    <div style={{ display: "flex", width: L.head.w, flexDirection: "column", alignItems: "center" }}>
                        {head.lines.map((t, i) =>
                            line(
                                i,
                                L.head.w,
                                {
                                    fontFamily: HEAD_F.family,
                                    fontWeight: HEAD_F.weight,
                                    fontSize: head.size,
                                    lineHeight: `${Math.round(head.size * LH.head)}px`,
                                    color: th.deep,
                                },
                                t,
                            ),
                        )}
                    </div>
                )}
                {sub && (
                    <div
                        style={{
                            display: "flex",
                            width: L.head.w,
                            flexDirection: "column",
                            alignItems: "center",
                            marginTop: head ? GAP.sub : 0,
                        }}
                    >
                        {sub.lines.map((t, i) =>
                            line(
                                i,
                                L.head.w,
                                {
                                    fontFamily: SUB_F.family,
                                    fontWeight: SUB_F.weight,
                                    fontSize: sub.size,
                                    lineHeight: `${Math.round(sub.size * LH.sub)}px`,
                                    color: th.sub,
                                },
                                t,
                            ),
                        )}
                    </div>
                )}
            </div>

            {/* the logo on its white plate, with the link beside it */}
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: 0,
                    top: L.logoTop,
                    width: W,
                    height: plateW,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: plateW,
                        height: plateW,
                        borderRadius: L.logo * 0.24 + L.plate,
                        backgroundColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: th.dark ? "0 10px 26px rgba(0,0,0,0.45)" : `0 10px 24px ${th.shadow}`,
                    }}
                >
                    <LogoMark size={L.logo} />
                </div>
                <div style={{ display: "flex", marginLeft: L.linkGap, flexDirection: "column" }}>
                    {link.lines.map((t, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                whiteSpace: "nowrap",
                                fontFamily: LINK_F.family,
                                fontSize: link.size,
                                lineHeight: `${Math.round(link.size * LH.link)}px`,
                                color: th.text,
                                letterSpacing: LINK_LS,
                            }}
                        >
                            {t}
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: L.text.x,
                    top: L.text.top,
                    width: L.text.w,
                    height: L.text.bottom - L.text.top,
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: L.text.w,
                        flexDirection: "column",
                        alignItems: "center",
                        paddingBottom: sh,
                    }}
                >
                    {fit.title.lines.map((t, i) =>
                        line(
                            i,
                            L.text.w,
                            {
                                fontFamily: "Jersey10",
                                fontSize: ts,
                                lineHeight: `${Math.round(ts * LH.title)}px`,
                                color: th.deep,
                                letterSpacing: titleLS(ts),
                                textShadow: `${sh}px ${sh}px 0 ${th.titleShadow}`,
                            },
                            t,
                        ),
                    )}
                </div>
                <div
                    style={{
                        display: "flex",
                        width: L.text.w,
                        flexDirection: "column",
                        alignItems: "center",
                        marginTop: GAP.artist,
                    }}
                >
                    {fit.artist.lines.map((t, i) =>
                        line(
                            i,
                            L.text.w,
                            {
                                fontFamily: ARTIST_F.family,
                                fontWeight: ARTIST_F.weight,
                                fontSize: as,
                                lineHeight: `${Math.round(as * LH.artist)}px`,
                                color: th.deep,
                            },
                            t,
                        ),
                    )}
                </div>
            </div>
            {player(th, playerTop)}
        </div>
    );
}

const recordCard: StoryCardDesign = {
    fonts: [
        { name: "Jersey10", file: "Jersey10-Regular.ttf", weight: 400 },
        { name: "Righteous", file: "Righteous-Regular.ttf", weight: 400 },
        { name: "Bricolage", file: "BricolageGrotesque-SemiBold.ttf", weight: 600 },
        { name: "Bricolage", file: "BricolageGrotesque-ExtraBold.ttf", weight: 800 },
    ],
    draw,
};

export default recordCard;
