import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import LogoMark from "@/components/LogoMark";
import { parseShareLook, shareImagePath, type ShareKind } from "@/lib/share";
import { artistFontSize, shareCard, titleFontSize } from "@/lib/shareCard";
import { STORY_CARDS } from "./cards";

// a story-size image of someone's song, made from the chart file only (no Spotify, no album art)
const SIZE = { width: 1080, height: 1920 };
const DARK = "#0b141d";
const LIGHT = "#eaf2f8";
const MUTED = "#93a6b8";
const BLUE = "#2f6bff";
const GREEN = "#16c79a";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

// a week, year, kind, style, and color always draw the same image, so browsers and the CDN can keep it
const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" };

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const [week, year, kind, style, color] = ["week", "year", "kind", "style", "color"].map(
        (name) => params.get(name) ?? "",
    );
    const card = shareCard(week, year, kind);
    // the style and color picked in the share sheet. only the 17th birthday picture has them
    const look = kind === "seventeen" ? parseShareLook(style, color) : null;

    // only the exact address the site builds gets drawn: extra or reordered params would each skip the CDN
    // cache and cost a fresh render
    const canonical =
        request.nextUrl.pathname + request.nextUrl.search ===
        shareImagePath(week, year, kind as ShareKind, look ?? undefined);
    if (!card || (kind === "seventeen" && !look) || !canonical) {
        return NextResponse.json({ message: "Missing or invalid week, year, kind, style, or color." }, { status: 400 });
    }

    if (look) {
        const { default: design } = await STORY_CARDS[look.style]();
        const fonts = await Promise.all(
            design.fonts.map(async ({ name, file, weight }) => ({
                name,
                data: await font(file),
                weight,
                style: "normal" as const,
            })),
        );
        return new ImageResponse(design.draw(card, look.color), { ...SIZE, fonts, headers: CACHE_HEADERS });
    }

    const [semiBold, extraBold] = await Promise.all([
        font("BricolageGrotesque-SemiBold.ttf"),
        font("BricolageGrotesque-ExtraBold.ttf"),
    ]);

    // laid out on a grid measured from Instagram's Story editor (y at 1080x1920): art only above 250, where
    // Instagram puts its own bar and the song's name. the message in 270 to 1140. the link band in 1230 to 1410,
    // for the Link sticker. a bare floor in 1420 to 1820, where Instagram drops the Music sticker. art only below
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                position: "relative",
                color: LIGHT,
                fontFamily: "Bricolage",
                backgroundColor: DARK,
                backgroundImage: `radial-gradient(circle at 15% 10%, ${BLUE}66, transparent 55%), radial-gradient(circle at 90% 85%, ${GREEN}55, transparent 50%)`,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: 64,
                    top: 270,
                    width: 952,
                    height: 870,
                    paddingBottom: 32, // room above "What's yours?"
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                    <LogoMark size={96} />
                    <div style={{ fontSize: 52, fontWeight: 800 }}>Birthday Beats</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 28 }}>
                    <div style={{ fontSize: 56, fontWeight: 600, color: MUTED }}>{card.heading}</div>
                    <div style={{ fontSize: titleFontSize(card.title), fontWeight: 800, lineHeight: 1.02 }}>
                        {card.title}
                    </div>
                    <div style={{ fontSize: artistFontSize(card.artist), fontWeight: 600, color: GREEN }}>
                        {card.artist}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 600, color: MUTED, marginTop: 8 }}>{card.year}</div>
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 1150,
                    width: 1080,
                    height: 70,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 64,
                    fontWeight: 800,
                }}
            >
                What&apos;s yours?
            </div>

            {/* the Link sticker goes here. drawn to look done without one, and the printed link still works
                if a reshare drops the sticker */}
            <div
                style={{
                    position: "absolute",
                    left: 180,
                    top: 1230,
                    width: 720,
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 44,
                    border: `4px dashed ${LIGHT}88`,
                    backgroundColor: `${LIGHT}14`,
                }}
            >
                <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, color: GREEN }}>{card.link}</div>
            </div>
        </div>,
        {
            ...SIZE,
            fonts: [
                { name: "Bricolage", data: semiBold, weight: 600, style: "normal" },
                { name: "Bricolage", data: extraBold, weight: 800, style: "normal" },
            ],
            headers: CACHE_HEADERS,
        },
    );
}
