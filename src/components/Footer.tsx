import { ReactElement } from "react";
import StatsCounter from "@/components/StatsCounter";

export default function Footer(): ReactElement {
    return (
        <footer className="mt-auto w-full border-t border-line px-4 py-6 text-xs text-muted">
            <div className="mx-auto mb-3 flex max-w-xl justify-center">
                <StatsCounter />
            </div>
            <div
                className="mx-auto flex max-w-xl flex-col text-center items-center gap-2 sm:flex-row
  sm:justify-between"
            >
                <p>Birthday Beats — Discover the #1 song on the day you were born</p>
                <div className="flex gap-4">
                    <a
                        href="https://www.linkedin.com/in/tjohnson009"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                    >
                        LinkedIn
                    </a>
                    <a
                        href="https://github.com/tjohnson009/birthday-beats"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                    >
                        GitHub
                    </a>
                </div>
                <p>© {new Date().getFullYear()} Tim Johnson</p>
            </div>
        </footer>
    );
}
