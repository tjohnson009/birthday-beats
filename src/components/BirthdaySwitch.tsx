import { ReactElement } from "react";
import { TREND_AGE, type BirthdayCheck } from "@/lib/dates";

export type BirthdayView = "born" | "seventeen";

type BirthdaySwitchProps = {
    view: BirthdayView;
    check: BirthdayCheck; // whether the 17th birthday has a chart
    turnsYear: number;
    bornHasChart: boolean; // false for /17 birthdays before Aug 1958
    busy: boolean; // a lookup is loading: one at a time, so taps can't pile up Spotify lookups
    onToggle: () => void;
};

// swaps the result between the birthday's #1 and the 17th birthday's #1, in the same layout
export default function BirthdaySwitch({
    view,
    check,
    turnsYear,
    bornHasChart,
    busy,
    onToggle,
}: BirthdaySwitchProps): ReactElement {
    const unavailable = view === "born" ? check !== "ok" : !bornHasChart;
    const label =
        view === "seventeen"
            ? bornHasChart
                ? "Back to the day you were born"
                : "No chart yet the day you were born"
            : check === "future"
              ? `You turn ${TREND_AGE} in ${turnsYear}`
              : check === "too-early"
                ? "Charts start in 1958"
                : `Your ${TREND_AGE}th birthday #1`;

    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={busy || unavailable}
            className="rounded-2xl border border-brand-blue/60 bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:border-brand-blue hover:bg-brand-blue/10 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:border-line disabled:text-muted disabled:shadow-none disabled:hover:bg-surface disabled:hover:cursor-default"
        >
            {view === "born" && check === "ok" && <span aria-hidden="true">🎂 </span>}
            {label}
        </button>
    );
}
