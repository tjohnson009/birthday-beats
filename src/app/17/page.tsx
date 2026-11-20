import type { Metadata } from "next";
import BirthdayBeats from "@/components/BirthdayBeats";
import { getHeroTitles } from "@/lib/showcase";

// the trend link: "the #1 song on your 17th birthday is how your 2027 will go"
export const metadata: Metadata = {
    title: "What was the #1 song on your 17th birthday? · Birthday Beats",
    description:
        "The trend says the #1 song on your 17th birthday is how your 2027 will go. Enter your birthday to hear yours.",
};

export default function SeventeenthBirthday() {
    return <BirthdayBeats heroTitles={getHeroTitles(60)} trend />;
}
