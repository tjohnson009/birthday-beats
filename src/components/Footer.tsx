import Link from "next/link";
import { roboto } from "@/lib/fonts";
import { ReactElement } from "react";

export default function Footer(): ReactElement {
    return (
        <footer
            className="mt-auto w-full border-t border-neutral-200 px-4 py-6 text-xs 
  text-neutral-500 dark:border-neutral-800"
        >
            <div
                className="mx-auto flex max-w-xl flex-col text-center items-center gap-2 sm:flex-row 
  sm:justify-between"
            >
                <p>Birthday Beats — the #1 song on the day you were born</p>
                <div className="flex gap-4">
                    <a
                        href="https://www.linkedin.com/in/tjohnson009"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-800 
  dark:hover:text-neutral-200"
                    >
                        LinkedIn
                    </a>
                    <a
                        href="https://github.com/tjohnson009/birthday-beats"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-800 
  dark:hover:text-neutral-200"
                    >
                        GitHub
                    </a>
                </div>
                <p>© {new Date().getFullYear()} Tim Johnson</p>
            </div>
        </footer>
    );
}
