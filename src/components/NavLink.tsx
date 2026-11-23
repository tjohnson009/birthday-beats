"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement, ReactNode } from "react";

// a header link that marks itself when you're on its page. a client component so the header can stay a server one
export default function NavLink({ href, children }: { href: string; children: ReactNode }): ReactElement {
    const current = usePathname() === href;
    // the padding makes a tap target at least 40px tall and gives the focus ring room. the negative margin
    // cancels it, so the header doesn't grow and the links don't move
    const className = `-mx-1 -my-2.5 px-1 py-2.5 ${current ? "text-foreground underline decoration-brand-blue decoration-2 underline-offset-[6px]" : "text-muted hover:text-foreground"}`;

    // on its own page it's a plain link, like the logo: next/link would keep the result on screen, while a full
    // load starts the page fresh
    if (current)
        return (
            <a href={href} aria-current="page" className={className}>
                {children}
            </a>
        );

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}
