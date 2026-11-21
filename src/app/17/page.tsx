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
        "Will 2027 be a party anthem or a breakup song? The trend says it's whatever hit #1 when you turned 17. Enter your birthday to see yours.",
    openGraph: {
        title: "What was the #1 song on your 17th birthday?",
        description:
            "Will 2027 be a party anthem or a breakup song? The trend says it's whatever hit #1 when you turned 17. Enter your birthday to see yours.",
        url: "/17",
        siteName: "Birthday Beats",
        type: "website",
    },
    twitter: { card: "summary_large_image" },
};

export default function SeventeenthBirthday() {
    return <BirthdayBeats heroTitles={getHeroTitles(60)} trend />;
}
