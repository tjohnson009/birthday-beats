import { display, roboto } from "@/lib/fonts";
import { ReactElement } from "react";
import LogoMark from "@/components/LogoMark";

export default function Header(): ReactElement {
    return (
        <header
            className={`${roboto.className} site-header flex justify-between items-center px-4 sm:px-6 py-3 w-full border-b border-line`}
        >
            <div className="logo">
                {/* a plain link on purpose: next/link to the page you're already on keeps the search result on screen,
                    while a full load always lands on the fresh home page */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className={`${display.className} flex items-center gap-2 text-lg font-extrabold`}>
                    <LogoMark className="h-7 w-7" />
                    Birthday Beats
                </a>
            </div>
            <nav className="nav-menu flex gap-1.5">
                <a
                    href="https://github.com/tjohnson009/birthday-beats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground"
                >
                    About
                </a>
            </nav>
        </header>
    );
}
