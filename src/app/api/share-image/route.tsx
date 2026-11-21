import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { shareImagePath, type ShareKind } from "@/lib/share";
import { artistFontSize, shareCard, titleFontSize } from "@/lib/shareCard";

// a story-size image of someone's song, made from the chart file only (no Spotify, no album art)
const SIZE = { width: 1080, height: 1920 };
const DARK = "#0b141d";
const LIGHT = "#eaf2f8";
const MUTED = "#93a6b8";
const BLUE = "#2f6bff";
const GREEN = "#16c79a";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const [week, year, kind] = ["week", "year", "kind"].map((name) => params.get(name) ?? "");
    const card = shareCard(week, year, kind);

    // only the exact address the site builds gets drawn: extra or reordered params would each skip the CDN
    // cache and cost a fresh render
    const canonical =
        request.nextUrl.pathname + request.nextUrl.search === shareImagePath(week, year, kind as ShareKind);
    if (!card || !canonical) {
        return NextResponse.json({ message: "Missing or invalid week, year, or kind." }, { status: 400 });
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
                    {/* same drawing as LogoMark */}
                    <svg viewBox="0 0 32 32" width={96} height={96}>
                        <defs>
                            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor={BLUE} />
                                <stop offset="1" stopColor={GREEN} />
                            </linearGradient>
                        </defs>
                        <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#g)" />
                        <rect x="6.6" y="19" width="4.6" height="7.4" rx="1.3" fill="#fff" fillOpacity=".6" />
                        <rect x="13.7" y="14.6" width="4.6" height="11.8" rx="1.3" fill="#fff" fillOpacity=".8" />
                        <rect x="20.8" y="11" width="4.6" height="15.4" rx="1.3" fill="#fff" />
                        <path d="M20.4 9.2V5.4L21.9 6.9L23.1 4.4L24.3 6.9L25.8 5.4V9.2Z" fill="#fff" />
                    </svg>
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
                    <div style={{ fontSize: 44, fontWeight: 600, color: MUTED, marginTop: 8 }}>{card.detail}</div>
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
            // a week, year, and kind always draw the same image, so browsers and the CDN can keep it
            headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
        },
    );
}
