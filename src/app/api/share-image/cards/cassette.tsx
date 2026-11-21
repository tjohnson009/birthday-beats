import type { CSSProperties, ReactElement } from "react";
import LogoMark from "@/components/LogoMark";
import { SHARE_COLORS, type ShareColor } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";
import TABLES from "./cassette.widths.json";
import { contrast, GOOD_BREAK_BEFORE, mix, smartApostrophes, splitLines, svgSrc } from "./shared";
import type { StoryCardDesign } from "./types";

// the Cassette picture: linen in a light wash of the color (navy for ink), the logo on its tile with the link beside
// it, the two heading lines in pixel type, and a black cassette with the year, title, and artist typed on its label.
// a plain patch under the cassette stays clear for Instagram's Music sticker. it matches the cassette draft element
// for element, so its numbers and svg strings stay as the draft has them

const CARD_W = 1080;
const CARD_H = 1920;

type FontKey = "pixel" | "deco" | "serifB" | "serif";
type Font = { family: string; weight: 400 | 700; w: FontKey; asc: number; desc: number };

// asc and desc are the hhea metrics both renderers use to place a line (units per em)
const FONT: Record<FontKey, Font> = {
    pixel: { family: "Jersey10", weight: 400, w: "pixel", asc: 1125 / 1400, desc: 375 / 1400 }, // heading lines
    deco: { family: "Righteous", weight: 400, w: "deco", asc: 2017 / 2048, desc: 526 / 2048 }, // the link
    serifB: { family: "Tinos", weight: 700, w: "serifB", asc: 1825 / 2048, desc: 443 / 2048 }, // title and year
    serif: { family: "Tinos", weight: 400, w: "serif", asc: 1825 / 2048, desc: 443 / 2048 }, // artist
};
const FONT_KEYS: FontKey[] = ["pixel", "deco", "serifB", "serif"];

// advance widths and kerning pairs in thousandths of an em, measured in Chrome from the font files, so the server
// can break lines with no browser
const WIDTH = Object.fromEntries(
    FONT_KEYS.map((k) => [k, new Map([...TABLES.chars].map((ch, i): [string, number] => [ch, TABLES.widths[k][i]]))]),
) as Record<FontKey, Map<string, number>>;
const KERN = Object.fromEntries(
    FONT_KEYS.map((k) => {
        const pairs = TABLES.kernPairs[k];
        const map = new Map<string, number>();
        for (let i = 0; i < pairs.length; i += 2) map.set(pairs.slice(i, i + 2), TABLES.kern[k][i / 2]);
        return [k, map];
    }),
) as Record<FontKey, Map<string, number>>;

const measure = (f: Font, text: string, size: number): number => {
    const w = WIDTH[f.w];
    const k = KERN[f.w];
    const avg = TABLES.avg[f.w] || 520;
    let s = 0;
    let prev = "";
    for (const ch of text) {
        s += w.get(ch) ?? avg;
        if (prev) s += k.get(prev + ch) || 0;
        prev = ch;
    }
    return (s * size) / 1000;
};

// spare room, so renderer rounding never pushes a line past its box
const SAFE = 0.97;

type Lines = { lines: string[]; widest: number };

// the lines at this size (see splitLines). a good break comes after a comma, ")" or "/", or before "(",
// "Featuring", "&", "With"
function breakLines(text: string, f: Font, size: number, maxW: number): Lines | null {
    const words = text.split(" ").filter(Boolean);
    if (!words.length) return { lines: [], widest: 0 };
    const lim = maxW * SAFE;
    const N = words.length;
    const wd = (a: number, b: number): number => measure(f, words.slice(a, b).join(" "), size);
    const awkward = (j: number): number => (/[,)/]$/.test(words[j - 1]) || GOOD_BREAK_BEFORE.test(words[j]) ? 0 : 1);
    const b = splitLines(N, wd, awkward, lim);
    if (!b) return null;
    const lines: string[] = [];
    let s0 = 0;
    for (const c of [...b.cuts, N]) {
        lines.push(words.slice(s0, c).join(" "));
        s0 = c;
    }
    return { lines, widest: b.max };
}

// where the baseline of a line sits inside its line box (both renderers center the font's hhea box in it)
const baselineIn = (f: Font, size: number, lh: number): number => (lh - (f.asc + f.desc) * size) / 2 + f.asc * size;

const INK = "#0F1E2E";
const TEXT = "#15171C"; // heading line 1 and the link, on the linen
const TYPE = "#17191F"; // label title, typed on the paper
const TYPE_SOFT = "#2B2F38"; // label artist
const PAPER = "#FBFAF6"; // the label paper
const PAPER_DARK = "#EDEBE5"; // the paper under the sheen at its darkest, for contrast
const RULE = "#2A2D33"; // the drawn lines on the label
const BASE_LINEN = "#EEEAE3";

// the lightest shade of c (mixed toward ink) that reaches the target contrast on bg
const darkenTo = (c: string, bg: string, target: number): string => {
    for (let t = 0; t <= 1.001; t += 0.02) {
        const d = mix(c, INK, t);
        if (contrast(d, bg) >= target) return d;
    }
    return INK;
};
// the darkest tint of c (mixed toward white) that reaches the target contrast on bg
const lightenTo = (c: string, bg: string, target: number): string => {
    for (let t = 0; t <= 1.001; t += 0.02) {
        const d = mix(c, "#FFFFFF", t);
        if (contrast(d, bg) >= target) return d;
    }
    return "#FFFFFF";
};

type Look = {
    hi: string; // what the weave, grain and soft light lighten toward
    lo: string; // what the weave, grain and vignette shade toward
    text: string; // heading line 1, the link, and the player icons
    rim: string; // the cassette's outer edge
    tileShadow: string;
    castShadow: string;
};
type Theme = Look & {
    accent: string;
    linen: string;
    stripes: { a: string; b: string; band: string };
    sub: string;
    year: string;
    onAccent: string;
};

// light cards: the weave lightens toward white and shades toward warm brown, words are near black
const LIGHT: Look = {
    hi: "#FFFFFF",
    lo: "#3A2E22",
    text: TEXT,
    rim: "#3A3B40",
    tileShadow: "0 10px 22px rgba(40,30,20,0.24), 0 2px 5px rgba(40,30,20,0.18)",
    castShadow: "0 30px 44px rgba(44,34,24,0.34), 0 10px 16px rgba(44,34,24,0.22)",
};
// ink turns the card dark like the other styles do. the weave lightens toward a pale navy (white would speckle),
// the cassette gets a lighter rim so the black shell doesn't sink into the navy, and the shadows go black
const DARK: Look & { linen: string; accent: string; stripes: Theme["stripes"] } = {
    linen: "#0E1C2E",
    hi: "#4C6789",
    lo: "#000000",
    text: "#F3ECDF",
    rim: "#6A7C92",
    accent: "#16C79A",
    stripes: { a: "#2F6BFF", b: "#16C79A", band: "#1D3754" },
    tileShadow: "0 10px 22px rgba(0,0,0,0.45), 0 2px 5px rgba(0,0,0,0.35)",
    castShadow: "0 30px 44px rgba(0,0,0,0.55), 0 10px 16px rgba(0,0,0,0.4)",
};

// ink goes navy with cream words and the logo's blue and green on the label; cream keeps a light linen with navy
// accents; the others wash the linen and stripe the label in the color
function theme(key: ShareColor): Theme {
    if (key === "ink") {
        // the lightest the weave, grain and soft light get under text
        const linenLight = mix(DARK.linen, DARK.hi, 0.65);
        return {
            ...DARK,
            sub: lightenTo(DARK.accent, linenLight, 5.4),
            year: darkenTo(DARK.accent, PAPER_DARK, 5.4),
            onAccent: contrast("#FFFFFF", DARK.accent) >= 2.6 ? "#FFFFFF" : INK,
        };
    }
    const hex: string = SHARE_COLORS[key];
    const accent = key === "cream" ? INK : hex;
    const linen = key === "cream" ? "#F3ECDF" : mix(BASE_LINEN, hex, 0.12);
    // the darkest the weave and the corner shading get under text
    const linenDark = mix(linen, LIGHT.lo, 0.14);
    const stripes =
        key === "cream"
            ? { a: INK, b: "#D4A66A", band: "#B98E5E" }
            : { a: hex, b: mix(hex, "#FFFFFF", 0.52), band: mix(hex, INK, 0.32) };
    return {
        ...LIGHT,
        accent,
        linen,
        stripes,
        // 5.4 on the darkest linen keeps 4.5 or more over the grain
        sub: darkenTo(accent, linenDark, 5.4),
        year: darkenTo(accent, PAPER_DARK, 5.4),
        // the play triangle (an icon, not text)
        onAccent: contrast("#FFFFFF", accent) >= 2.6 ? "#FFFFFF" : INK,
    };
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const r2 = (n: number): number => Math.round(n * 100) / 100;

// seeded random, so every card gets the same linen
const rng = (seed: number) => (): number => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// a plain weave of 4 px threads, a fine random grain so no thread runs as a stripe, a few big soft blotches so it
// never looks printed, a soft light and a soft vignette
function linenSvg(t: Theme): string {
    const L = t.linen;
    const HI = t.hi;
    const LO = t.lo;
    const R = rng(1414);
    const weft = mix(L, HI, 0.26);
    const warp = mix(L, LO, 0.04);
    const G = 23; // grain tile of 23 x 23 cells of 4 px: an odd count, so it never lines up with the weave
    let grain = "";
    for (let y = 0; y < G; y++)
        for (let x = 0; x < G; x++) {
            const v = R();
            if (v < 0.28)
                grain += `<rect x="${x * 4}" y="${y * 4}" width="4" height="4" fill="${HI}" fill-opacity="${r1(0.12 + R() * 0.22)}"/>`;
            else if (v > 0.74)
                grain += `<rect x="${x * 4}" y="${y * 4}" width="4" height="4" fill="${LO}" fill-opacity="${r1(0.03 + R() * 0.05) || 0.03}"/>`;
        }
    let blots = "";
    for (let i = 0; i < 16; i++) {
        const cx = Math.round(R() * 1080);
        const cy = Math.round(R() * 1920);
        const rx = Math.round(140 + R() * 320);
        const ry = Math.round(rx * (0.5 + R() * 0.6));
        blots += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${R() < 0.5 ? "bl" : "bd"})"/>`;
    }
    return `<defs>
      <pattern id="wv" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="${warp}"/>
        <rect x="0" y="0" width="4" height="4" fill="${weft}"/><rect x="4" y="4" width="4" height="4" fill="${weft}"/>
      </pattern>
      <pattern id="gr" width="${G * 4}" height="${G * 4}" patternUnits="userSpaceOnUse">${grain}</pattern>
      <pattern id="ed" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect x="0" y="0.6" width="0.8" height="2.8" fill="${LO}" fill-opacity="0.16"/>
        <rect x="4" y="4.6" width="0.8" height="2.8" fill="${LO}" fill-opacity="0.16"/>
        <rect x="4.6" y="0" width="2.8" height="0.8" fill="${LO}" fill-opacity="0.14"/>
        <rect x="0.6" y="4" width="2.8" height="0.8" fill="${LO}" fill-opacity="0.14"/>
        <rect x="0.8" y="1.2" width="2.6" height="0.9" rx="0.4" fill="${HI}" fill-opacity="0.22"/>
        <rect x="4.8" y="5.2" width="2.6" height="0.9" rx="0.4" fill="${HI}" fill-opacity="0.22"/>
      </pattern>
      <radialGradient id="bl"><stop offset="0" stop-color="${HI}" stop-opacity="0.16"/><stop offset="1" stop-color="${HI}" stop-opacity="0"/></radialGradient>
      <radialGradient id="bd"><stop offset="0" stop-color="${LO}" stop-opacity="0.06"/><stop offset="1" stop-color="${LO}" stop-opacity="0"/></radialGradient>
      <radialGradient id="vg" cx="50%" cy="46%" r="75%">
        <stop offset="0.55" stop-color="${LO}" stop-opacity="0"/>
        <stop offset="1" stop-color="${LO}" stop-opacity="0.12"/>
      </radialGradient>
      <radialGradient id="lt" cx="42%" cy="34%" r="55%">
        <stop offset="0" stop-color="${HI}" stop-opacity="0.2"/>
        <stop offset="1" stop-color="${HI}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1080" height="1920" fill="${L}"/>
    <rect width="1080" height="1920" fill="url(#wv)"/>
    <rect width="1080" height="1920" fill="url(#ed)"/>
    <rect width="1080" height="1920" fill="url(#gr)"/>
    ${blots}
    <rect width="1080" height="1920" fill="url(#lt)"/>
    <rect width="1080" height="1920" fill="url(#vg)"/>`;
}

// the cassette, 800 units wide. its label paper is taller than a real tape's so the words can be typed big; the
// window, stripes and head opening keep the tape look
const CAS_W = 800;
const WT = 36; // label paper top
const WB = 290; // label paper bottom, where the stripes start
const STRIPES = 98;
const BAND = 64;
const LB = WB + STRIPES + BAND; // label bottom
const TT = LB + 36; // top of the head opening
const CAS_H = TT + 112;

function cassetteSvg(t: Theme): string {
    const st = t.stripes;
    const SHELL = "#1B1C1F";
    const RIDGE = "#26272B";
    const RIDGE_HI = "#323338";
    const sh = STRIPES / 5;
    let stripes = "";
    [st.a, st.b, st.a, st.b, st.a].forEach((c, i) => {
        stripes += `<rect x="38" y="${r1(WB + i * sh)}" width="724" height="${r1(sh + 0.4)}" fill="${c}"/>`;
    });
    const PY = WB + 6; // the window pill's top
    // grey ring, white hub, six teeth
    const reel = (cx: number, cy: number): string => {
        let teeth = "";
        for (let i = 0; i < 6; i++)
            teeth += `<rect x="${cx - 3.2}" y="${cy - 17.5}" width="6.4" height="8" rx="1" fill="#EEF0F2" transform="rotate(${i * 60} ${cx} ${cy})"/>`;
        return `<circle cx="${cx}" cy="${cy}" r="41" fill="#C6CBD0"/>
        <circle cx="${cx}" cy="${cy}" r="41" fill="none" stroke="#8E959C" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="33" fill="#D7DBDF"/>
        <circle cx="${cx}" cy="${cy}" r="25" fill="#F2F3F5"/>
        <circle cx="${cx}" cy="${cy}" r="17.5" fill="#101113"/>${teeth}`;
    };
    let ticks = "";
    for (let i = 0; i <= 15; i++) {
        const x = 342 + i * 7.73;
        ticks += `<rect x="${r1(x)}" y="${PY + (i % 5 === 0 ? 88 : 90)}" width="1.6" height="${i % 5 === 0 ? 9 : 6}" fill="#6E7278"/>`;
    }
    const H = CAS_H;
    return `<defs>
      <pattern id="kn" width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="${SHELL}"/>
        <rect x="1" y="1" width="5" height="5" rx="0.8" fill="${RIDGE}"/>
        <rect x="1" y="1" width="5" height="1.3" rx="0.6" fill="${RIDGE_HI}"/>
      </pattern>
      <linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.10"/>
        <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
      </linearGradient>
      <clipPath id="win"><rect x="334" y="${PY + 18}" width="132" height="64" rx="6"/></clipPath>
      <clipPath id="lab"><rect x="38" y="${WT}" width="724" height="${LB - WT}" rx="11"/></clipPath>
    </defs>
    <rect x="0" y="0" width="800" height="${H}" rx="26" fill="#121315"/>
    <rect x="3" y="3" width="794" height="${H - 6}" rx="24" fill="url(#kn)"/>
    <rect x="3" y="3" width="794" height="${H - 6}" rx="24" fill="none" stroke="${t.rim}" stroke-width="2" stroke-opacity="0.7"/>
    <rect x="28" y="26" width="744" height="${LB + 10 - 26}" rx="16" fill="#151619"/>
    <g clip-path="url(#lab)">
      <rect x="38" y="${WT}" width="724" height="${LB - WT}" fill="${PAPER}"/>
      ${stripes}
      <rect x="38" y="${WB + STRIPES}" width="724" height="${BAND}" fill="${st.band}"/>
      <rect x="38" y="${WT}" width="724" height="${LB - WT}" fill="url(#sheen)" fill-opacity="0.4"/>
    </g>
    <rect x="192" y="${PY}" width="416" height="116" rx="58" fill="#0D0E10"/>
    <rect x="192" y="${PY}" width="416" height="116" rx="58" fill="none" stroke="#34363C" stroke-width="3"/>
    ${reel(262, PY + 58)}
    ${reel(538, PY + 58)}
    <rect x="334" y="${PY + 18}" width="132" height="64" rx="6" fill="#1E1714"/>
    <g clip-path="url(#win)">
      <circle cx="350" cy="${PY + 50}" r="56" fill="#5C4030"/>
      <circle cx="350" cy="${PY + 50}" r="44" fill="#4E3527"/>
      <circle cx="350" cy="${PY + 50}" r="30" fill="#5C4030"/>
      <circle cx="462" cy="${PY + 50}" r="34" fill="#4A3225"/>
      <circle cx="462" cy="${PY + 50}" r="22" fill="#563B2C"/>
      <path d="M346 ${PY + 18} L376 ${PY + 18} L356 ${PY + 82} L326 ${PY + 82} Z" fill="#FFFFFF" fill-opacity="0.10"/>
    </g>
    <rect x="334" y="${PY + 18}" width="132" height="64" rx="6" fill="none" stroke="#3B3E45" stroke-width="2"/>
    ${ticks}
    <path d="M148 ${H} L177 ${TT + 8} Q179 ${TT} 187 ${TT} L613 ${TT} Q621 ${TT} 623 ${TT + 8} L652 ${H} Z" fill="url(#kn)"/>
    <path d="M148 ${H} L177 ${TT + 8} Q179 ${TT} 187 ${TT} L613 ${TT} Q621 ${TT} 623 ${TT + 8} L652 ${H}" fill="none" stroke="#0B0C0D" stroke-width="3"/>
    <path d="M181 ${TT + 4} L619 ${TT + 4}" stroke="#3A3B40" stroke-width="2" stroke-opacity="0.8"/>
    <circle cx="236" cy="${H - 40}" r="12" fill="#08090A"/><circle cx="236" cy="${H - 40}" r="12" fill="none" stroke="#3A3B40" stroke-width="2"/>
    <circle cx="564" cy="${H - 40}" r="12" fill="#08090A"/><circle cx="564" cy="${H - 40}" r="12" fill="none" stroke="#3A3B40" stroke-width="2"/>
    <rect x="292" y="${H - 54}" width="26" height="26" rx="5" fill="#08090A"/><rect x="292" y="${H - 54}" width="26" height="26" rx="5" fill="none" stroke="#3A3B40" stroke-width="2"/>
    <rect x="482" y="${H - 54}" width="26" height="26" rx="5" fill="#08090A"/><rect x="482" y="${H - 54}" width="26" height="26" rx="5" fill="none" stroke="#3A3B40" stroke-width="2"/>
    <rect x="0" y="0" width="800" height="${H}" rx="26" fill="url(#sheen)"/>`;
}

// the little box on the label that holds the year, its top left corner cut
const yearBoxSvg = (w: number, h: number): string =>
    `<path d="M17 1.5 H${w - 1.5} V${h - 1.5} H1.5 V17 Z" fill="none" stroke="${RULE}" stroke-width="2.5" stroke-linejoin="round"/>`;

// three music notes: a single eighth note, a beamed pair, a sixteenth note
function notesSvg(c: string): string {
    const head = (x: number, y: number): string =>
        `<ellipse cx="${x}" cy="${y}" rx="16" ry="11.5" transform="rotate(-24 ${x} ${y})" fill="${c}"/>`;
    const stem = (x: number, y: number, h: number): string =>
        `<rect x="${x + 10.5}" y="${y - h}" width="5" height="${h}" rx="1.5" fill="${c}"/>`;
    const flag = (x: number, y: number, h: number, dy = 0): string =>
        `<path d="M${x + 10.5} ${y - h + dy} C${x + 14} ${y - h + 18 + dy} ${x + 40} ${y - h + 22 + dy} ${x + 34} ${y - h + 56 + dy} C${x + 31} ${y - h + 36 + dy} ${x + 22} ${y - h + 28 + dy} ${x + 10.5} ${y - h + 22 + dy} Z" fill="${c}"/>`;
    return `${head(104, 88)}${stem(104, 88, 72)}${flag(104, 88, 72)}
      ${head(30, 206)}${stem(30, 206, 70)}${head(92, 192)}${stem(92, 192, 70)}
      <path d="M40.5 136 L103 122 L103 134 L40.5 148 Z" fill="${c}"/>
      <path d="M40.5 156 L103 142 L103 151 L40.5 165 Z" fill="${c}"/>
      ${head(166, 210)}${stem(166, 210, 74)}${flag(166, 210, 74)}${flag(166, 210, 74, 20)}`;
}

// progress bar (no timestamps) and the player buttons
function playerSvg(t: Theme): string {
    const track = mix(t.linen, t.text, 0.22);
    const I = t.text;
    const A = t.accent;
    const tri = (pts: string): string =>
        `<polygon points="${pts}" fill="${I}" stroke="${I}" stroke-width="5" stroke-linejoin="round"/>`;
    return `<rect x="40" y="13" width="680" height="7" rx="3.5" fill="${track}"/>
      <rect x="40" y="10" width="300" height="13" rx="6.5" fill="${A}"/>
      <circle cx="340" cy="16.5" r="19" fill="${A}"/>
      <circle cx="340" cy="16.5" r="19" fill="none" stroke="#FFFFFF" stroke-width="5"/>
      <g stroke="${I}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M118 120 L148 102"/><path d="M118 120 L148 138"/></g>
      <circle cx="116" cy="120" r="10" fill="${I}"/><circle cx="150" cy="101" r="10" fill="${I}"/><circle cx="150" cy="139" r="10" fill="${I}"/>
      ${tri("246,100 246,140 218,120")}${tri("274,100 274,140 246,120")}
      <circle cx="380" cy="120" r="58" fill="${A}"/>
      <polygon points="365,94 365,146 408,120" fill="${t.onAccent}" stroke="${t.onAccent}" stroke-width="8" stroke-linejoin="round"/>
      ${tri("486,100 486,140 514,120")}${tri("514,100 514,140 542,120")}
      <path d="M640 140 C618 124 606 114 606 102 C606 92 614 85 623 85 C630 85 636 89 640 96 C644 89 650 85 657 85 C666 85 674 92 674 102 C674 114 662 124 640 140 Z" fill="${I}"/>`;
}

// next/og draws these svg pictures straight into the png: next/image and alt text don't apply
const svgImg = (w: number, h: number, vbW: number, vbH: number, inner: string, style: CSSProperties): ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={svgSrc(w, h, inner, vbW, vbH)} width={w} height={h} style={{ position: "absolute", ...style }} />
);

// one line of text in a box of exact height. each word gets its own box, as wide as the width table says (kerning
// included), one space apart: next/og spaces words by their unkerned width but draws them kerned, which leaves a
// gap after a word like "Your"
const line = (f: Font, size: number, lh: number, color: string, text: string, key?: number): ReactElement => {
    const words = text.split(" ").filter(Boolean);
    const gap = r2(measure(f, " ", size));
    const widths = words.map((w) => r2(measure(f, w, size)));
    const width = r2(widths.reduce((sum, w) => sum + w, 0) + gap * (words.length - 1));
    return (
        <div
            key={key}
            style={{
                display: "flex",
                width,
                height: lh,
                lineHeight: lh + "px",
                fontFamily: f.family,
                fontWeight: f.weight,
                fontSize: size,
                color,
                whiteSpace: "nowrap",
                flexShrink: 0,
            }}
        >
            {words.map((w, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        width: widths[i],
                        height: lh,
                        flexShrink: 0,
                        ...(i ? { marginLeft: gap } : {}),
                    }}
                >
                    {w}
                </div>
            ))}
        </div>
    );
};

// layout, in px at 1080 x 1920. Instagram covers y < 250 and y > 1650, and TikTok's buttons sit on the right edge
// in y 750 to 1500. words stay in x 80 to 1000 and y 260 to 1600 (x 940 at most in TikTok's band), and the sticker
// patch stays clear

const ROW = { top: 272, logo: 148, gap: 26, maxW: 900 }; // logo and link
const LINK_SIZES = [76, 74, 72, 70, 68, 66, 64, 62, 60, 58, 56, 54, 52];
const HEAD = { x: 80, w: 920, top: 438, bottom: 604, gap: 6 }; // the two heading lines
const H1_SIZES = [92, 88, 84, 80, 76, 72, 68, 64, 60, 56];
const H2_SIZES = [64, 60, 56, 52, 48, 44, 40];
const H_LH = 0.9; // Jersey 10 sits low in its box; 0.9 em clears the descenders
const CS = { x: 90, y: 620, w: 900, s: 900 / CAS_W, h: Math.round(CAS_H * (900 / CAS_W)) }; // the cassette
const LBL = {
    x0: CS.x + 38 * CS.s,
    x1: CS.x + 762 * CS.s,
    y0: CS.y + WT * CS.s,
    y1: CS.y + WB * CS.s,
    padX: 26,
    padY: 20,
    box: { w: 140, h: 116 },
};
const COL_X = Math.round(LBL.x0 + LBL.padX + LBL.box.w + 28); // title and artist, right of the year box
const COL_W = Math.round(LBL.x1 - LBL.padX - COL_X);
// x 80 to 800 from just under the cassette to y 1648 stays clear for Instagram's Music sticker
const PATCH_Y = CS.y + CS.h + 26;
const NOTES = { x: 842, y: PATCH_Y + 34, w: 150, h: 177 }; // beside the patch, never in it
const PLAYER = { x: 160, y: 1668, w: 760, h: 190 }; // under Instagram's reply bar: art only

// label text steps: the title keeps 56 px or more on every test song
const T_SIZES = [88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36];
const tMaxLines = (s: number): number => (s >= 56 ? 2 : 3);
const T_LH = 1.06;
const A_STEPS = [
    [44, 2],
    [40, 2],
    [36, 3],
    [33, 3],
    [30, 4],
    [28, 5],
];
const A_LH = 1.16;
const RULE_UNDER = 6; // a drawn line under the title and under the artist
const RULE_H = 2;
const AFTER_RULE = 12;

type Fit = { size: number; lh: number; lines: string[]; widest?: number; overflow?: boolean };

function fitLabel(titleText: string, artistText: string) {
    const title = smartApostrophes(titleText).trim();
    const artist = smartApostrophes(artistText).trim();
    const avail = LBL.y1 - LBL.y0 - 2 * LBL.padY;
    const tryTitle = (size: number, max: number): Fit | null => {
        const r = breakLines(title, FONT.serifB, size, COL_W);
        return r && r.lines.length <= max ? { size, lh: Math.round(size * T_LH), ...r } : null;
    };
    const tryArtist = (size: number, max: number): Fit | null => {
        const r = breakLines(artist, FONT.serif, size, COL_W);
        return r && r.lines.length <= max ? { size, lh: Math.round(size * A_LH), ...r } : null;
    };
    const height = (T: Fit, A: Fit): number =>
        T.lines.length * T.lh + RULE_UNDER + RULE_H + AFTER_RULE + A.lines.length * A.lh + RULE_UNDER + RULE_H;
    // the artist keeps its biggest step that still leaves the title 56 px or more, then the title takes the
    // biggest size that fits; only a very long title and artist go below that
    for (const floor of [56, 0]) {
        for (const [as, amax] of A_STEPS) {
            const A = tryArtist(as, amax);
            if (!A) continue;
            for (const ts of T_SIZES) {
                if (ts < floor) break;
                const T = tryTitle(ts, tMaxLines(ts));
                if (!T || height(T, A) > avail) continue;
                // a title that wraps keeps one line instead when that costs it 14 percent of its size or less
                if (T.lines.length > 1) {
                    for (const s1 of T_SIZES) {
                        if (s1 >= ts || s1 < Math.max(floor, ts * 0.86)) continue;
                        const T1 = tryTitle(s1, 1);
                        if (T1 && height(T1, A) <= avail) return { T: T1, A, h: height(T1, A), avail };
                    }
                }
                return { T, A, h: height(T, A), avail };
            }
        }
    }
    // nothing fits: smallest steps, as many lines as it takes
    const ts = T_SIZES[T_SIZES.length - 1];
    const [as] = A_STEPS[A_STEPS.length - 1];
    const T = tryTitle(ts, 99) || { size: ts, lh: Math.round(ts * T_LH), lines: [title], overflow: true };
    const A = tryArtist(as, 99) || { size: as, lh: Math.round(as * A_LH), lines: [artist], overflow: true };
    return { T, A, h: height(T, A), avail };
}

// the two heading lines: line 1 as big as fits on one line, line 2 smaller; both fit between the logo row and the
// cassette
function fitHeading(heading: string, subheading: string) {
    const h1 = heading.trim();
    const h2 = subheading.trim();
    const budget = HEAD.bottom - HEAD.top;
    const one = (s: string, f: Font, sizes: number[], cap: number): Fit | null => {
        if (!s) return null;
        for (const size of sizes) {
            if (size > cap) continue;
            const r = breakLines(s, f, size, HEAD.w);
            if (r && r.lines.length === 1) return { size, lh: Math.round(size * H_LH), ...r };
        }
        const size = sizes[sizes.length - 1];
        const r = breakLines(s, f, size, HEAD.w);
        return { size, lh: Math.round(size * H_LH), ...(r || { lines: [s] }), overflow: !r || r.lines.length > 2 };
    };
    const A = one(h1, FONT.pixel, H1_SIZES, 999);
    const B = one(h2, FONT.pixel, H2_SIZES, A ? Math.floor(A.size * 0.72) : 999);
    const h = (A ? A.lines.length * A.lh : 0) + (A && B ? HEAD.gap : 0) + (B ? B.lines.length * B.lh : 0);
    return { A, B, h, budget };
}

function draw(card: ShareCard, color: ShareColor): ReactElement {
    const t = theme(color);

    // logo on its tile, the link beside it, the row centered
    const link = card.link.trim();
    let urlSize = LINK_SIZES[LINK_SIZES.length - 1];
    for (const s of LINK_SIZES)
        if (ROW.logo + ROW.gap + measure(FONT.deco, link, s) <= ROW.maxW * SAFE) {
            urlSize = s;
            break;
        }
    const urlW = Math.ceil(measure(FONT.deco, link, urlSize)) + 8;
    const rowW = ROW.logo + ROW.gap + urlW;
    const rowX = Math.round((CARD_W - rowW) / 2);
    const urlLH = Math.round(urlSize * 1.25);

    // the two heading lines, centered between the logo row and the cassette
    const { A: head, B: sub, h: headH, budget } = fitHeading(card.heading, card.subheading);
    const headTop = HEAD.top + Math.round((budget - headH) / 2);
    const subTop = headTop + (head ? head.lines.length * head.lh + HEAD.gap : 0);

    // the label: the title and artist typed on drawn lines, centered on the paper
    const L = fitLabel(card.title, card.artist);
    const top = Math.round(LBL.y0 + LBL.padY + (L.avail - L.h) / 2);
    const tH = L.T.lines.length * L.T.lh;
    const aH = L.A.lines.length * L.A.lh;
    const rule1 = top + tH + RULE_UNDER;
    const aTop = rule1 + RULE_H + AFTER_RULE;
    const rule2 = aTop + aH + RULE_UNDER;
    const ruleW = Math.round(LBL.x1 - LBL.padX - COL_X);
    // the year box lines up with the top of the title
    const bx = Math.round(LBL.x0 + LBL.padX);
    const by = top + Math.max(0, Math.round(baselineIn(FONT.serifB, L.T.size, L.T.lh) - 0.7 * L.T.size)) - 6;
    const ySize = 52;
    const yLH = Math.round(ySize * 1.1);

    return (
        <div
            style={{
                display: "flex",
                position: "relative",
                width: CARD_W,
                height: CARD_H,
                backgroundColor: t.linen,
                overflow: "hidden",
            }}
        >
            {svgImg(CARD_W, CARD_H, CARD_W, CARD_H, linenSvg(t), { left: 0, top: 0 })}

            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: rowX,
                    top: ROW.top,
                    width: ROW.logo,
                    height: ROW.logo,
                    borderRadius: Math.round(ROW.logo * 0.24),
                    backgroundColor: "#2F6BFF",
                    boxShadow: t.tileShadow,
                }}
            >
                <LogoMark size={ROW.logo} />
            </div>
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: rowX + ROW.logo + ROW.gap,
                    top: ROW.top + Math.round((ROW.logo - urlLH) / 2) + 2,
                    width: urlW,
                    height: urlLH,
                }}
            >
                {line(FONT.deco, urlSize, urlLH, t.text, link)}
            </div>

            {head && (
                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: HEAD.x,
                        top: headTop,
                        width: HEAD.w,
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    {head.lines.map((s, i) => line(FONT.pixel, head.size, head.lh, t.text, s, i))}
                </div>
            )}
            {sub && (
                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: HEAD.x,
                        top: subTop,
                        width: HEAD.w,
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    {sub.lines.map((s, i) => line(FONT.pixel, sub.size, sub.lh, t.sub, s, i))}
                </div>
            )}

            {/* the cassette, with a soft shadow on the linen */}
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: CS.x + 6,
                    top: CS.y + 10,
                    width: CS.w - 12,
                    height: CS.h - 12,
                    borderRadius: 26 * CS.s,
                    backgroundColor: "#1B1C1F",
                    boxShadow: t.castShadow,
                }}
            />
            {svgImg(CS.w, CS.h, CAS_W, CAS_H, cassetteSvg(t), { left: CS.x, top: CS.y })}

            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: COL_X,
                    top,
                    width: COL_W,
                    flexDirection: "column",
                }}
            >
                {L.T.lines.map((s, i) => line(FONT.serifB, L.T.size, L.T.lh, TYPE, s, i))}
            </div>
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: COL_X,
                    top: rule1,
                    width: ruleW,
                    height: RULE_H,
                    backgroundColor: RULE,
                }}
            />
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: COL_X,
                    top: aTop,
                    width: COL_W,
                    flexDirection: "column",
                }}
            >
                {L.A.lines.map((s, i) => line(FONT.serif, L.A.size, L.A.lh, TYPE_SOFT, s, i))}
            </div>
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: COL_X,
                    top: rule2,
                    width: ruleW,
                    height: RULE_H,
                    backgroundColor: RULE,
                }}
            />
            {svgImg(LBL.box.w, LBL.box.h, LBL.box.w, LBL.box.h, yearBoxSvg(LBL.box.w, LBL.box.h), {
                left: bx,
                top: by,
            })}
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: bx,
                    top: by + Math.round((LBL.box.h - yLH) / 2) + 2,
                    width: LBL.box.w,
                    height: yLH,
                    justifyContent: "center",
                }}
            >
                {line(FONT.serifB, ySize, yLH, t.year, card.year)}
            </div>

            {svgImg(NOTES.w, NOTES.h, 200, 236, notesSvg(t.accent), { left: NOTES.x, top: NOTES.y })}
            {svgImg(PLAYER.w, PLAYER.h, 760, 190, playerSvg(t), { left: PLAYER.x, top: PLAYER.y })}
        </div>
    );
}

const cassette: StoryCardDesign = {
    fonts: [
        { name: "Jersey10", file: "Jersey10-Regular.ttf", weight: 400 },
        { name: "Righteous", file: "Righteous-Regular.ttf", weight: 400 },
        { name: "Tinos", file: "Tinos-Bold.ttf", weight: 700 },
        { name: "Tinos", file: "Tinos-Regular.ttf", weight: 400 },
    ],
    draw,
};

export default cassette;
