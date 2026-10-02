import Link from "next/link";
import { roboto } from "@/lib/fonts";
import { ReactElement } from "react";

export default function Header(): ReactElement {
    return (
        <header className={`${roboto.className} site-header flex justify-between items-center px-5 py-3 w-full`}>
            <div className="logo">
                <Link href="/">Birthday Beats</Link>
                </div>
            <nav className="nav-menu flex gap-1.5">
                <a href="https://github.com/tjohnson009/birthday-beats" target="_blank" rel="noopener noreferrer">About</a>
            </nav>
        </header>
    );
}
