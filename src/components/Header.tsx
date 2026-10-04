import Link from "next/link";
import { roboto } from "@/lib/fonts";
import { ReactElement } from "react";

export default function Header(): ReactElement {
    return (
        <header className={`${roboto.className} site-header flex justify-between items-center px-4 sm:px-6 py-3 w-full border-b border-neutral-200 dark:border-neutral-800`}>
            <div className="logo">
                <Link href="/" className="text-lg font-bold">Birthday Beats</Link>
                </div>
            <nav className="nav-menu flex gap-1.5">
                <a href="https://github.com/tjohnson009/birthday-beats" target="_blank" rel="noopener noreferrer">About</a>
            </nav>
        </header>
    );
}
