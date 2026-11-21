import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { TREND_AGE } from "@/lib/dates";
import { shareLink } from "@/lib/share";

// the /17 link preview in chats and feeds ("Send to a friend" shares this link). the same for everyone:
// it asks the question, and the story picture answers it. same look as the story picture
export const alt = `What was the #1 song on your ${TREND_AGE}th birthday? Birthday Beats`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// the story picture's colors
const DARK = "#0b141d";
const LIGHT = "#eaf2f8";
const MUTED = "#93a6b8";
const BLUE = "#2f6bff";
const GREEN = "#16c79a";

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));
const [semiBold, extraBold] = await Promise.all([
    font("BricolageGrotesque-SemiBold.ttf"),
    font("BricolageGrotesque-ExtraBold.ttf"),
]);

export default function Image() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "56px 72px 64px",
                color: LIGHT,
                fontFamily: "Bricolage",
                backgroundColor: DARK,
                backgroundImage: `radial-gradient(circle at 10% 0%, ${BLUE}66, transparent 55%), radial-gradient(circle at 95% 100%, ${GREEN}55, transparent 50%)`,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* same drawing as LogoMark */}
                <svg viewBox="0 0 32 32" width={64} height={64}>
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
                <div style={{ fontSize: 36, fontWeight: 800 }}>Birthday Beats</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 20 }}>
                {/* three pieces with a word-wide gap, so a line never starts with a space */}
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        columnGap: 20,
                        fontSize: 76,
                        fontWeight: 800,
                        lineHeight: 1.05,
                    }}
                >
                    <span>What was the</span>
                    <span style={{ color: GREEN }}>#1 song</span>
                    <span>on your {TREND_AGE}th birthday?</span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 600, color: MUTED }}>
                    The trend says it&apos;s how your 2027 will go.
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    alignSelf: "flex-start",
                    marginTop: 36,
                    padding: "18px 36px",
                    borderRadius: 40,
                    border: `3px dashed ${LIGHT}88`,
                    backgroundColor: `${LIGHT}14`,
                    fontSize: 32,
                    fontWeight: 600,
                    color: GREEN,
                }}
            >
                {shareLink("seventeen").replace("https://", "")}
            </div>
        </div>,
        {
            ...size,
            fonts: [
                { name: "Bricolage", data: semiBold, weight: 600, style: "normal" },
                { name: "Bricolage", data: extraBold, weight: 800, style: "normal" },
            ],
        },
    );
}
