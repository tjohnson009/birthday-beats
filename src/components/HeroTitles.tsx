"use client";
import { ReactElement, useEffect, useRef, useState } from "react";
import { display } from "@/lib/fonts";

type HeroTitlesProps = {
    titles: string[];
    searched: boolean;
};

const ROWS = 5;

// a faint, slowly drifting wall of past #1 titles behind the page. each row is printed twice
// so sliding it left by half its width loops without a seam.
// the mask (title-wall in globals.css) keeps the middle clear so the titles only show in the margins,
// and clears a wider middle once a result is on screen. it's left off below lg: phones have no margins to fill
export default function HeroTitles({ titles, searched }: HeroTitlesProps): ReactElement {
    const rows = Array.from({ length: ROWS }, (_, row) => titles.filter((_, i) => i % ROWS === row));
    const rowsRef = useRef<HTMLDivElement>(null);
    const [introHeight, setIntroHeight] = useState(0);

    // the result makes the page taller, which would drop the titles to the new middle. so after a search
    // the rows keep the intro's height and stay put
    useEffect(() => {
        if (searched) return;
        const observer = new ResizeObserver(([entry]) => setIntroHeight(entry.contentRect.height));
        observer.observe(rowsRef.current!);
        return () => observer.disconnect();
    }, [searched]);

    return (
        // overflow-clip, not hidden: hidden would make this a scroll box and stop the rows from sticking
        <div
            aria-hidden="true"
            className={`${display.className} title-wall pointer-events-none absolute inset-0 -z-10 hidden overflow-clip lg:block ${
                searched ? "title-wall-result" : ""
            }`}
        >
            {/* sticky, so the titles stay beside whatever part of a long result is on screen */}
            <div
                ref={rowsRef}
                style={searched && introHeight ? { height: introHeight } : undefined}
                className="sticky top-0 flex h-full max-h-full flex-col justify-center gap-6"
            >
                {rows.map((row, i) => (
                    // a bit stronger in light mode, where the faint titles were hard to see
                    <div
                        key={i}
                        className={`flex w-max gap-10 whitespace-nowrap text-5xl font-extrabold text-foreground/[0.1] dark:text-foreground/[0.07] animate-marquee motion-reduce:animate-none ${
                            i % 2 === 1 ? "[animation-direction:reverse] -translate-x-1/4" : ""
                        }`}
                    >
                        {[...row, ...row].map((title, j) => (
                            <span key={j}>{title}</span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
