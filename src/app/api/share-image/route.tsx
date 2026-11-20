import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { artistFontSize, shareCard, titleFontSize } from "@/lib/share";

// a story-size image of someone's song, made from the chart file only (no Spotify, no album art)
const SIZE = { width: 1080, height: 1920 };
const DARK = "#0b141d";
const LIGHT = "#eaf2f8";
const MUTED = "#93a6b8";
const BLUE = "#2f6bff";
const GREEN = "#16c79a";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

// a day of slack past today, so someone ahead of UTC can share on their birthday
const latestDate = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const card = shareCard(params.get("date") ?? "", params.get("kind") ?? "", latestDate());

    if (!card) {
        return NextResponse.json({ message: "Missing or invalid date or kind." }, { status: 400 });
    }

    const [semiBold, extraBold] = await Promise.all([
        font("BricolageGrotesque-SemiBold.ttf"),
        font("BricolageGrotesque-ExtraBold.ttf"),
    ]);

    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "120px 96px 140px",
                color: LIGHT,
                fontFamily: "Bricolage",
                backgroundColor: DARK,
                backgroundImage: `radial-gradient(circle at 15% 10%, ${BLUE}66, transparent 55%), radial-gradient(circle at 90% 85%, ${GREEN}55, transparent 50%)`,
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

            {/* left empty for the Instagram link sticker */}
            <div style={{ display: "flex", height: 300, marginTop: "auto" }} />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 64, fontWeight: 800 }}>{card.cta}</div>
                <div style={{ fontSize: 44, fontWeight: 600, color: GREEN }}>{card.link}</div>
            </div>
        </div>,
        {
            ...SIZE,
            fonts: [
                { name: "Bricolage", data: semiBold, weight: 600, style: "normal" },
                { name: "Bricolage", data: extraBold, weight: 800, style: "normal" },
            ],
            // each date and kind always draws the same image, so the CDN can keep it
            headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
        },
    );
}
