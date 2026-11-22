import { display, roboto } from "@/lib/fonts";
import { ReactElement } from "react";
import LogoMark from "@/components/LogoMark";
import NavLink from "@/components/NavLink";

export default function Header(): ReactElement {
    return (
        <header
            className={`${roboto.className} site-header flex justify-between items-center px-4 max-[359px]:px-3 sm:px-6 py-3 w-full border-b border-line`}
        >
            <div className="logo">
                {/* a plain link on purpose: next/link to the page you're already on keeps the search result on screen,
                    while a full load always lands on the fresh home page */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/" className={`${display.className} flex items-center gap-2 text-lg font-extrabold`}>
                    <LogoMark className="h-8 w-8" />
                    Birthday Beats
                </a>
            </div>
            {/* under 360px wide, smaller links here and less header padding keep the logo and both links on one line */}
            <nav className="nav-menu flex gap-4 max-[359px]:gap-3 max-[359px]:text-sm">
                <NavLink href="/17">Your 2027</NavLink>
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
