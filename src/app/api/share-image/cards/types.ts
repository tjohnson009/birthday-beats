import type { ReactElement } from "react";
import type { ShareColor } from "@/lib/share";
import type { ShareCard } from "@/lib/shareCard";

// a font file in src/assets/fonts, and the name and weight the card's styles ask for it by
export type CardFont = { name: string; file: string; weight: 400 | 500 | 600 | 700 | 800 | 900 };

// one style of the 17th birthday story picture: the fonts it needs and how it draws a song in a picked color.
// drawn by next/og, so flexbox only: every element with more than one child needs display: flex
export type StoryCardDesign = {
    fonts: CardFont[];
    draw: (card: ShareCard, color: ShareColor) => ReactElement;
};
