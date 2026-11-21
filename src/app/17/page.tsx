import type { Metadata } from "next";
import BirthdayBeats from "@/components/BirthdayBeats";
import { SITE_URL } from "@/lib/share";
import { getHeroTitles } from "@/lib/showcase";

// the trend link: "the #1 song on your 17th birthday is how your 2027 will go"
export const metadata: Metadata = {
    // link previews need full addresses; the preview picture is ./opengraph-image.tsx
    metadataBase: new URL(SITE_URL),
    title: "What was the #1 song on your 17th birthday? · Birthday Beats",
    description:
        "The trend says the #1 song on your 17th birthday is how your 2027 will go. Enter your birthday to hear yours.",
    openGraph: {
        title: "What was the #1 song on your 17th birthday?",
        description: "The trend says it's how your 2027 will go. Enter your birthday to hear yours.",
        url: "/17",
        siteName: "Birthday Beats",
        type: "website",
    },
    twitter: { card: "summary_large_image" },
};

export default function SeventeenthBirthday() {
    return <BirthdayBeats heroTitles={getHeroTitles(60)} trend />;
}
