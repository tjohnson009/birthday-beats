import type { CSSProperties, ReactElement } from "react";
import LogoMark from "@/components/LogoMark";
import { SHARE_COLORS, type ShareColor } from "@/lib/share";
import widthTable from "./player.widths.json";
import { contrast, GOOD_BREAK_BEFORE, keepsParts, keptSplit, mix, rgba, splitLines, tableWidth } from "./shared";
import type { StoryCardDesign } from "./types";

// the Player picture: a music player card in the picked color, with a record peeking out behind it, on a white
// page. next/og never breaks a line here: every line is measured and broken below, so the picture always shows
// the lines that were fitted. the clear page under the card is left for Instagram's Music sticker

type FontKey = "semi" | "bold" | "serif";
type Face = { family: string; weight: 400 | 600 | 800; w: FontKey };

// glyph widths per 1000 px, measured in Chrome from these same TTFs. next/og doesn't kern them, so a sum is exact
const WIDTHS: Record<FontKey, Record<string, number>> = widthTable;

const W = 1080;
const H = 1920;
const WHITE = "#FFFFFF";
const INK = "#0F1E2E";
const BLACK = "#000000";
const PAGE = "#FFFFFF";

// the record's center label, picked to pop against each card color. ink gets a two-color label
const LABELS: Record<ShareColor, { label: string; label2?: string }> = {
    blue: { label: "#16C79A" },
    green: { label: "#2F6BFF" },
    pink: { label: "#FFD23F" },
    orange: { label: "#2F6BFF" },
    purple: { label: "#FFB81C" },
    red: { label: "#FFD23F" },
    ink: { label: "#2F6BFF", label2: "#16C79A" },
    cream: { label: "#FF7A1A" },
};

const svgData = (svg: string): string => "data:image/svg+xml;base64," + btoa(svg);
// curly apostrophes and quotes (they're in the width table, and read better big)
const smartQuotes = (t: string): string =>
    t
        .replace(/'/g, "’")
        .replace(/(^|[\s([])"/g, "$1“")
        .replace(/"/g, "”");

type Palette = {
    on: string;
    base: string;
    top: string;
    bottom: string;
    deep: string;
    mid: string;
    rule: string;
    track: string;
    label: string;
    label2: string;
    edge: string | null;
};

// text on the card is white or ink, whichever reads better. if the color misses 4.8:1 with it (blue and red with
// white), the card goes just dark enough. the gradient only moves away from the text color, so all of it passes
const TEXT_MIN = 4.8;
function palette(color: ShareColor): Palette {
    const hex = SHARE_COLORS[color];
    const sw = LABELS[color];
    const on = contrast(hex, WHITE) >= contrast(hex, INK) ? WHITE : INK;
    let base: string = hex;
    for (let t = 0.01; contrast(base, on) < TEXT_MIN && t <= 0.6; t += 0.01)
        base = mix(hex, on === WHITE ? BLACK : WHITE, t);
    const top = on === WHITE ? base : mix(base, WHITE, 0.16);
    const bottom = on === WHITE ? mix(base, BLACK, 0.18) : base;
    // the two heading lines on the white page: a deep shade of the color, and a softer one for the second line
    const shade = (min: number): string => {
        let c: string = hex;
        for (let t = 0.02; contrast(c, PAGE) < min && t <= 1; t += 0.02) c = mix(hex, INK, t);
        return c;
    };
    const deep = shade(7.5);
    const mid = shade(5.4);
    return {
        on,
        base,
        top,
        bottom,
        deep,
        mid,
        rule: rgba(deep, 0.45),
        track: rgba(on, 0.3),
        label: sw.label,
        label2: sw.label2 || mix(sw.label, BLACK, 0.16),
        // cream is close to the white page, so its card gets a thin edge
        edge: color === "cream" ? mix(hex, INK, 0.12) : null,
    };
}

const F = {
    semi: { family: "Bricolage", weight: 600, w: "semi" },
    bold: { family: "Bricolage", weight: 800, w: "bold" },
    serif: { family: "DM Serif Display", weight: 400, w: "serif" },
} satisfies Record<FontKey, Face>;

const measure = (f: Face, text: string, size: number, ls = 0): number => tableWidth(WIDTHS[f.w], text, size, ls);
const SAFE = 0.97; // spare room, so renderer rounding never pushes a line past its box
// a space that never breaks (it keeps "Bill Conti · 1977" together). measured and drawn as a space
const GLUE = "\u0001";
const show = (t: string): string => t.split(GLUE).join(" ");

type Token = { t: string; sp: boolean };
// break at spaces, and also right after "/" or "..." ("Come Together/" + "Something", "Flashdance..." + "What")
const tokens = (text: string): Token[] =>
    text
        .split(" ")
        .filter(Boolean)
        .flatMap((w, i) => w.split(/(?<=\/|\.\.\.)(?=.)/).map((t, j) => ({ t, sp: i > 0 && j === 0 })));

// breaksPart: the lines break inside a part of the text in ( ), [ ] or quotes (see keepsParts)
type Broken = { lines: string[]; n: number; widest: number; awk: number; breaksPart?: boolean };

// a text's pieces at this size: a run of them as one line, its width, and how awkward a break before piece j is. a
// good break comes after a comma, ")" or "/", or before "(", "Featuring", "&"...
function pieces(text: string, f: Face, size: number, ls: number) {
    const tk = tokens(text);
    const join = (a: number, b: number): string =>
        show(
            tk
                .slice(a, b)
                .map((x, i) => (i > 0 && x.sp ? " " : "") + x.t)
                .join(""),
        );
    const wd = (a: number, b: number): number => measure(f, join(a, b), size, ls);
    const awkward = (j: number): number =>
        !tk[j].sp || /[,)/]$/.test(tk[j - 1].t) || GOOD_BREAK_BEFORE.test(tk[j].t) ? 0 : 1;
    const lines = (cuts: number[]): string[] => [0, ...cuts].map((a, m) => join(a, cuts[m] ?? tk.length));
    return { words: tk.map((x) => x.t), wd, awkward, lines };
}

// the lines at this size (see splitLines). null if one word alone is too wide
function breakLines(text: string, f: Face, size: number, maxW: number, ls = 0): Broken | null {
    const { words, wd, awkward, lines } = pieces(text, f, size, ls);
    const lim = maxW * SAFE;
    if (words.length === 0) return { lines: [""], n: 1, widest: 0, awk: 0 };
    const b = splitLines(words.length, wd, awkward, lim);
    if (!b) return null;
    const breaksPart = !keepsParts(words, b.cuts, (i, j) => wd(i, j) <= lim);
    return { lines: lines(b.cuts), n: b.n, widest: b.max, awk: b.bad, breaksPart };
}

// the fewest lines, up to max, that keep the text's parts in ( ), [ ] or quotes whole. null if none do
function keptLines(text: string, f: Face, size: number, maxW: number, ls: number, max: number): Broken | null {
    const { words, wd, awkward, lines } = pieces(text, f, size, ls);
    const r = keptSplit(words, max, wd, maxW * SAFE, awkward);
    return r && { lines: lines(r.cuts), n: r.n, widest: r.max, awk: r.bad };
}

// layout in px at 1080 x 1920, after the player draft: 800 wide, the logo as the big art centered at the top, the
// link right under it. the card ends by y 1338 at most, so the page below it down to Instagram's reply bar
// (y 1650) stays clear for the Music sticker
const L = {
    side: 96, // left edge of the heading lines and the card
    headTop: 270, // the serif's font box starts at y 261, just below the 260 safe line under Instagram's top bar
    headW: 888,
    h1Gap: 6,
    ruleGap: 26,
    cardTop: 434,
    cardW: 800,
    cardMin: 780,
    cardMax: 904,
    radius: 64,
    padX: 52,
    padTop: 46,
    padBottom: 46,
    logoMin: 232,
    logoMax: 300,
    ring: 8,
    logoUrlGap: 12,
    urlLS: -0.5,
    minGap: 36,
    prefGap: 60,
    titleArtistGap: 10,
    artistBarGap: 30,
    barH: 24,
    barIconsGap: 22,
    iconsH: 96,
    footTop: 1660, // the closing rule, under the sticker patch
    record: { r: 318, rim: 24, over: 40, dy: -24, labelR: 108 },
};
const TEXT_W = L.cardW - 2 * L.padX;
const CARD_RIGHT = L.side + L.cardW;
const BARS = L.artistBarGap + L.barH + L.barIconsGap + L.iconsH;

// size steps: the real heading words take the first ones. the link steps down only if a longer link comes along
const H1_SIZES = [68, 64, 60, 56, 52, 48, 44];
const H2_SIZES = [42, 40, 38, 36];
const URL_SIZES = [58, 56, 54, 52];
const URL_LH = 1.18;
// title steps by measured width, big and short first, more lines as it shrinks
const TITLE_SIZES = [124, 116, 108, 100, 94, 88, 82, 76, 70, 64, 58, 52];
const titleMaxLines = (z: number): number => (z >= 108 ? 2 : z >= 88 ? 3 : 4);
const TITLE_LH = 1.0;
const ARTIST_LH = 1.2;
// [size, most lines]
const ARTIST_STEPS = [
    [52, 1],
    [48, 1],
    [52, 2],
    [48, 2],
    [44, 2],
    [44, 3],
    [40, 3],
    [38, 4],
    [34, 4],
    [30, 5],
    [28, 6],
];

function fitHeading(text: string, f: Face, sizes: number[], room: number): number {
    for (const z of sizes) if (measure(f, text, z) <= room * SAFE) return z;
    return sizes[sizes.length - 1];
}

// the link has its own line under the logo, so it only steps down if a longer link comes along
function fitUrl(link: string): number {
    for (const z of URL_SIZES) if (measure(F.bold, link, z, L.urlLS) <= TEXT_W * SAFE) return z;
    return URL_SIZES[URL_SIZES.length - 1];
}

type TitleFit = { size: number; ls: number; lines: string[]; h: number; score: number; breaksPart?: boolean };
type ArtistFit = { size: number; lines: string[]; h: number };

// the title is the hero. each size is scored (bigger is better, an awkward break or an extra line costs a little),
// and the best title that leaves the artist line readable wins. the floors relax only when nothing fits
function fitSong(s: { title: string; artistLine: string }, room: number): { title: TitleFit; artist: ArtistFit } {
    // keep: only lines that keep the title's parts in ( ), [ ] or quotes whole
    const fitTitles = (keep: boolean): TitleFit[] => {
        const out: TitleFit[] = [];
        for (const z of TITLE_SIZES) {
            const ls = -z * 0.01;
            const r = keep
                ? keptLines(s.title, F.bold, z, TEXT_W, ls, titleMaxLines(z))
                : breakLines(s.title, F.bold, z, TEXT_W, ls);
            if (r && r.n <= titleMaxLines(z))
                out.push({
                    size: z,
                    ls,
                    lines: r.lines,
                    h: Math.round(r.n * z * TITLE_LH),
                    score: z - 10 * r.awk - 4 * (r.n - 1),
                    breaksPart: r.breaksPart,
                });
        }
        return out.sort((a, b) => b.score - a.score || b.size - a.size);
    };
    const titles = fitTitles(false);
    const artists: ArtistFit[] = [];
    for (const [z, max] of ARTIST_STEPS) {
        const r = breakLines(s.artistLine, F.semi, z, TEXT_W);
        if (r && r.n <= max) artists.push({ size: z, lines: r.lines, h: Math.round(r.n * z * ARTIST_LH) });
    }
    const pick = (choices: TitleFit[]) => {
        for (const floor of [44, 38, 0])
            for (const t of choices)
                for (const a of artists) {
                    if (a.size < floor) continue;
                    if (t.h + L.titleArtistGap + a.h <= room) return { title: t, artist: a };
                }
        return null;
    };
    const fit = pick(titles);
    // a title that breaks inside a part in ( ), [ ] or quotes takes the best size that keeps its parts whole
    if (fit?.title.breaksPart) return pick(fitTitles(true)) ?? fit;
    if (fit) return fit;
    // last resort (no chart song lands here): the smallest of everything
    const z = TITLE_SIZES[TITLE_SIZES.length - 1];
    const t = titles.length
        ? titles.reduce((p, q) => (q.size < p.size ? q : p))
        : { size: z, ls: -z * 0.01, lines: [s.title], h: z, score: 0 };
    const a = artists[artists.length - 1] || { size: 28, lines: [show(s.artistLine)], h: 34 };
    return { title: t, artist: a };
}

// one line of text in a box of exact height, so it stacks the same in every renderer. kerning off to match the
// width table (next/og ignores it, browsers don't)
const lineStyle = (f: Face, size: number, lh: number, color: string, extra: CSSProperties = {}): CSSProperties => ({
    display: "flex",
    fontFamily: f.family,
    fontWeight: f.weight,
    fontSize: size,
    color,
    lineHeight: `${lh}px`,
    height: lh,
    flexShrink: 0,
    whiteSpace: "nowrap",
    fontKerning: "none",
    ...extra,
});

const svgImg = (w: number, h: number, inner: string, vb = `0 0 ${w} ${h}`): ReactElement => (
    // eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not the browser
    <img
        src={svgData(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${inner}</svg>`,
        )}
        width={w}
        height={h}
        alt=""
        style={{ display: "flex" }}
    />
);

// the logo as it is, on a white plate with a soft shadow, so it stands off the colored card
function logo(size: number): ReactElement {
    const tile = size - 2 * L.ring;
    const r = Math.round(tile * 0.24);
    return (
        <div
            style={{
                display: "flex",
                width: size,
                height: size,
                borderRadius: r + L.ring,
                backgroundColor: WHITE,
                padding: L.ring,
                flexShrink: 0,
                boxShadow: "0 12px 26px rgba(15,30,46,0.22)",
            }}
        >
            <LogoMark size={tile} />
        </div>
    );
}

// a vinyl record on a white platter, drawn from circles
function record(P: Palette, cardH: number): ReactElement {
    const { r: R, rim, labelR: LR } = L.record;
    const S = 2 * (R + rim);
    const c = S / 2;
    const grooves: string[] = [];
    for (let r = LR + 16; r < R - 8; r += 9)
        grooves.push(
            `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="${r % 2 ? 0.05 : 0.085}" stroke-width="1.6"/>`,
        );
    const wedge = (a1: number, a2: number, op: number): string => {
        const p = (a: number): string =>
            [c + R * Math.cos((a * Math.PI) / 180), c + R * Math.sin((a * Math.PI) / 180)]
                .map((v) => v.toFixed(1))
                .join(" ");
        return `<path d="M${c} ${c} L${p(a1)} A${R} ${R} 0 0 1 ${p(a2)} Z" fill="#FFFFFF" fill-opacity="${op}"/>`;
    };
    const inner = [
        "<defs>",
        `<radialGradient id="plat" cx="0.5" cy="0.5" r="0.5"><stop offset="0.88" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6E8EC"/></radialGradient>`,
        `<radialGradient id="vin" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2B2D33"/><stop offset="0.7" stop-color="#16171B"/><stop offset="1" stop-color="#08090B"/></radialGradient>`,
        `<linearGradient id="lab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.label}"/><stop offset="0.5" stop-color="${P.label}"/><stop offset="0.5" stop-color="${P.label2}"/><stop offset="1" stop-color="${P.label2}"/></linearGradient>`,
        "</defs>",
        `<circle cx="${c}" cy="${c}" r="${R + rim}" fill="url(#plat)"/>`,
        `<circle cx="${c}" cy="${c}" r="${R}" fill="url(#vin)"/>`,
        grooves.join(""),
        wedge(-62, -28, 0.07) + wedge(118, 152, 0.07) + wedge(-20, -8, 0.04),
        `<circle cx="${c}" cy="${c}" r="${LR + 8}" fill="none" stroke="#000000" stroke-opacity="0.5" stroke-width="10"/>`,
        `<circle cx="${c}" cy="${c}" r="${LR}" fill="url(#lab)"/>`,
        `<circle cx="${c}" cy="${c}" r="${LR - 26}" fill="none" stroke="#000000" stroke-opacity="0.12" stroke-width="2"/>`,
        `<circle cx="${c}" cy="${c}" r="12" fill="#F4F5F7"/>`,
    ].join("");
    // centered on the card's height and just past its right edge, so the label still shows
    const cx = CARD_RIGHT + L.record.over;
    const cy = L.cardTop + cardH / 2 + L.record.dy;
    return (
        <div
            style={{
                display: "flex",
                position: "absolute",
                left: cx - c,
                top: Math.round(cy - c),
                width: S,
                height: S,
                borderRadius: S / 2,
                boxShadow: "0 30px 60px rgba(15,30,46,0.22)",
            }}
        >
            {svgImg(S, S, inner)}
        </div>
    );
}

// player controls on a 24-unit grid: shuffle, back, play, forward, repeat
function controls(P: Palette): ReactElement {
    const st = `fill="none" stroke="${P.on}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`;
    const ic = (size: number, inner: string): ReactElement => svgImg(size, size, inner, "0 0 24 24");
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: TEXT_W,
                height: L.iconsH,
                marginTop: L.barIconsGap,
                flexShrink: 0,
                paddingLeft: 4,
                paddingRight: 4,
            }}
        >
            {ic(
                54,
                `<path ${st} d="M3 17H7.5Q10 17 11.4 14.6L14.6 9.4Q16 7 18.5 7H21M18.4 4.4L21 7L18.4 9.6"/><path ${st} d="M3 7H7.5Q9.6 7 10.9 8.9M13.1 15.1Q14.4 17 16.5 17H21M18.4 14.4L21 17L18.4 19.6"/>`,
            )}
            {ic(
                62,
                `<path fill="${P.on}" d="M19 5.2V18.8Q19 20 18 19.4L8.6 13.1Q7.4 12 8.6 10.9L18 4.6Q19 4 19 5.2Z"/><rect x="4.4" y="4.6" width="2.6" height="14.8" rx="1.3" fill="${P.on}"/>`,
            )}
            {ic(
                L.iconsH,
                `<circle cx="12" cy="12" r="12" fill="${P.on}"/><path fill="${P.base}" d="M9.6 7.6Q9.6 6.7 10.4 7.2L17 11.3Q17.8 12 17 12.7L10.4 16.8Q9.6 17.3 9.6 16.4Z"/>`,
            )}
            {ic(
                62,
                `<path fill="${P.on}" d="M5 5.2V18.8Q5 20 6 19.4L15.4 13.1Q16.6 12 15.4 10.9L6 4.6Q5 4 5 5.2Z"/><rect x="17" y="4.6" width="2.6" height="14.8" rx="1.3" fill="${P.on}"/>`,
            )}
            {ic(
                54,
                `<path ${st} d="M4 11.5V10Q4 7 7 7H19.5M17 4.4L19.6 7L17 9.6"/><path ${st} d="M20 12.5V14Q20 17 17 17H4.5M7 14.4L4.4 17L7 19.6"/>`,
            )}
        </div>
    );
}

function progress(P: Palette): ReactElement {
    const fill = Math.round(TEXT_W * 0.36);
    const knob = 26;
    const y = (L.barH - 6) / 2;
    return (
        <div
            style={{
                display: "flex",
                position: "relative",
                width: TEXT_W,
                height: L.barH,
                marginTop: L.artistBarGap,
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: 0,
                    top: y,
                    width: TEXT_W,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: P.track,
                }}
            />
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: 0,
                    top: y,
                    width: fill,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: P.on,
                }}
            />
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    left: fill - knob / 2,
                    top: (L.barH - knob) / 2,
                    width: knob,
                    height: knob,
                    borderRadius: knob / 2,
                    backgroundColor: P.on,
                }}
            />
        </div>
    );
}

const player: StoryCardDesign = {
    fonts: [
        { name: "Bricolage", file: "BricolageGrotesque-SemiBold.ttf", weight: 600 },
        { name: "Bricolage", file: "BricolageGrotesque-ExtraBold.ttf", weight: 800 },
        { name: "DM Serif Display", file: "DMSerifDisplay-Regular.ttf", weight: 400 },
    ],
    draw: (card, color) => {
        const P = palette(color);
        const title = smartQuotes(card.title);
        const artist = smartQuotes(card.artist);
        // the year rides on the artist line, glued so it never ends up alone on a line
        const artistLine = card.year ? `${artist}${GLUE}·${GLUE}${card.year}` : artist;

        // the second heading line is in the sans: at phone size the serif's "1" reads as an "I" ("#1", "17")
        const h1 = fitHeading(card.heading, F.serif, H1_SIZES, L.headW);
        const h2 = fitHeading(card.subheading, F.semi, H2_SIZES, L.headW - 140 - L.ruleGap);
        const h1LH = Math.round(h1 * 1.12);
        const h2LH = Math.round(h2 * 1.2);

        const urlSize = fitUrl(card.link);
        const urlLH = Math.round(urlSize * URL_LH);
        const fixed = L.padTop + L.logoUrlGap + urlLH + BARS + L.padBottom;
        // the song is fitted as if the logo were its smallest, so a long song never gives up title size to the logo
        const f = fitSong({ title, artistLine }, L.cardMax - fixed - L.logoMin - L.minGap);
        const textH = f.title.h + L.titleArtistGap + f.artist.h;
        // then the logo grows into the room the song leaves, up to its size in the player draft
        const logoSize = Math.max(L.logoMin, Math.min(L.logoMax, L.cardMax - fixed - L.prefGap - textH));
        const cardH = Math.max(L.cardMin, Math.min(L.cardMax, fixed + logoSize + L.prefGap + textH));
        const titleLH = Math.round(f.title.size * TITLE_LH);
        const artistLH = Math.round(f.artist.size * ARTIST_LH);
        const shadow = "0 46px 70px -26px rgba(15,30,46,0.42)";

        return (
            <div
                style={{
                    display: "flex",
                    position: "relative",
                    width: W,
                    height: H,
                    backgroundColor: PAGE,
                    overflow: "hidden",
                }}
            >
                {record(P, cardH)}

                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: L.side,
                        top: L.cardTop,
                        width: L.cardW,
                        height: cardH,
                        borderRadius: L.radius,
                        backgroundImage: `linear-gradient(180deg, ${P.top} 0%, ${P.bottom} 100%)`,
                        boxShadow: P.edge ? `0 0 0 3px ${P.edge}, ${shadow}` : shadow,
                        flexDirection: "column",
                        paddingTop: L.padTop,
                        paddingBottom: L.padBottom,
                        paddingLeft: L.padX,
                        paddingRight: L.padX,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: TEXT_W,
                            flexShrink: 0,
                        }}
                    >
                        {logo(logoSize)}
                        <div
                            style={lineStyle(F.bold, urlSize, urlLH, P.on, {
                                marginTop: L.logoUrlGap,
                                letterSpacing: L.urlLS,
                            })}
                        >
                            {card.link}
                        </div>
                    </div>
                    <div style={{ display: "flex", flexGrow: 1, minHeight: L.minGap }} />
                    <div style={{ display: "flex", flexDirection: "column", width: TEXT_W, flexShrink: 0 }}>
                        {f.title.lines.map((x, i) => (
                            <div
                                key={`title-${i}`}
                                style={lineStyle(F.bold, f.title.size, titleLH, P.on, { letterSpacing: f.title.ls })}
                            >
                                {x}
                            </div>
                        ))}
                        <div style={{ display: "flex", height: L.titleArtistGap, flexShrink: 0 }} />
                        {f.artist.lines.map((x, i) => (
                            <div key={`artist-${i}`} style={lineStyle(F.semi, f.artist.size, artistLH, P.on)}>
                                {x}
                            </div>
                        ))}
                    </div>
                    {progress(P)}
                    {controls(P)}
                </div>

                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: L.side,
                        top: L.headTop,
                        width: L.headW,
                        flexDirection: "column",
                    }}
                >
                    <div style={lineStyle(F.serif, h1, h1LH, P.deep)}>{card.heading}</div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            width: L.headW,
                            height: h2LH,
                            marginTop: L.h1Gap,
                            flexShrink: 0,
                        }}
                    >
                        {card.subheading ? (
                            <div style={lineStyle(F.semi, h2, h2LH, P.mid, { marginRight: L.ruleGap })}>
                                {card.subheading}
                            </div>
                        ) : null}
                        <div
                            style={{
                                display: "flex",
                                flexGrow: 1,
                                height: 3,
                                borderRadius: 2,
                                backgroundColor: P.rule,
                            }}
                        />
                    </div>
                </div>

                {/* the closing rule, under the clear patch left for the Music sticker */}
                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        left: L.side,
                        top: L.footTop,
                        width: L.headW,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: P.rule,
                    }}
                />
            </div>
        );
    },
};

export default player;
