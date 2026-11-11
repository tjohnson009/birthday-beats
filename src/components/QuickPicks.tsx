import { ReactElement, useSyncExternalStore } from "react";
import { FIRST_CHART_DATE, formatShortDate, randomIsoDateBetween } from "@/lib/dates";
import { NOTABLE_DATES, type NotableDate } from "@/lib/notableDates";
import { pickRandom } from "@/lib/random";

type QuickPicksProps = {
    today: string;
    onPick: (date: string) => void;
};

const NOTABLE_PICKS = 2;
const noPicks: NotableDate[] = [];

// picked once per page load, in the browser only, so each refresh shows different dates
// and the server render (which has none) never disagrees with it during hydration
const browserPicks = typeof window === "undefined" ? noPicks : pickRandom(NOTABLE_DATES, NOTABLE_PICKS);

const subscribe = () => () => {};

export default function QuickPicks({ today, onPick }: QuickPicksProps): ReactElement {
    const notable = useSyncExternalStore(
        subscribe,
        () => browserPicks,
        () => noPicks,
    );

    const picks = [
        { label: "Surprise me", date: () => randomIsoDateBetween(FIRST_CHART_DATE, today) },
        { label: "Today", date: () => today },
        ...notable.map((pick) => ({ label: `${pick.label} · ${formatShortDate(pick.date)}`, date: () => pick.date })),
    ];

    return (
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Try a date">
            {picks.map((pick) => (
                <li key={pick.label} className="max-w-full">
                    <button
                        type="button"
                        disabled={today === ""}
                        onClick={() => onPick(pick.date())}
                        className="max-w-full rounded-2xl border border-line bg-surface/70 px-3 py-1.5 text-sm text-balance text-muted hover:border-brand-blue hover:text-foreground hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-50 disabled:hover:cursor-default"
                    >
                        {pick.label}
                    </button>
                </li>
            ))}
        </ul>
    );
}
