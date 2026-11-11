import { ReactElement } from "react";
import { display } from "@/lib/fonts";

type HeroTitlesProps = {
    titles: string[];
    hidden: boolean;
};

const ROWS = 5;

// a faint, slowly drifting wall of past #1 titles behind the intro. each row is printed twice
// so sliding it left by half its width loops without a seam.
// the mask keeps the middle clear so the titles only show in the margins beside the text,
// which is why it's left off below lg: phones have no margins to fill
export default function HeroTitles({ titles, hidden }: HeroTitlesProps): ReactElement {
    const rows = Array.from({ length: ROWS }, (_, row) => titles.filter((_, i) => i % ROWS === row));

    return (
        <div
            aria-hidden="true"
            className={`${display.className} pointer-events-none absolute inset-0 -z-10 hidden flex-col justify-center gap-6 overflow-hidden mask-[linear-gradient(to_right,black_6%,transparent_28%,transparent_72%,black_94%)] transition-opacity duration-700 lg:flex ${
                hidden ? "opacity-0" : "opacity-100"
            }`}
        >
            {rows.map((row, i) => (
                <div
                    key={i}
                    className={`flex w-max gap-10 whitespace-nowrap text-5xl font-extrabold text-foreground/[0.07] animate-marquee motion-reduce:animate-none ${
                        i % 2 === 1 ? "[animation-direction:reverse] -translate-x-1/4" : ""
                    }`}
                >
                    {[...row, ...row].map((title, j) => (
                        <span key={j}>{title}</span>
                    ))}
                </div>
            ))}
        </div>
    );
}
