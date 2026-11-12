import { ReactElement } from "react";
import { daysInMonth, parseIsoDate, toIsoDate, withDatePart } from "@/lib/dates";

type DatePickerProps = {
    value: string; // YYYY-MM-DD, or "" before the browser knows today's date
    min: string;
    max: string;
    onChange: (value: string) => void;
    className?: string;
};

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const Chevron = (): ReactElement => (
    <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 h-3 w-3 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
    >
        <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const selectClass =
    "appearance-none bg-transparent py-2 pl-2 pr-6 rounded-lg font-medium hover:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:text-muted max-[359px]:pl-1.5 max-[359px]:pr-5";

// month / day / year as three native selects: phones open their own wheel for each,
// and on a computer you can jump straight to a year instead of paging a calendar back decades
export default function DatePicker({ value, min, max, onChange, className = "" }: DatePickerProps): ReactElement {
    const ready = value !== "" && max !== "";
    const { year, month, day } = parseIsoDate(ready ? value : min);
    const lowest = parseIsoDate(min);
    const highest = parseIsoDate(ready ? max : min);

    const change = (part: "year" | "month" | "day") => (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(withDatePart(value, { [part]: Number(e.currentTarget.value) }, min, max));
    };

    const outOfRange = (date: string) => date < min || date > max;

    return (
        <div className={`flex items-center ${className}`}>
            <label className="relative flex items-center">
                <span className="sr-only">Month</span>
                <select value={ready ? month : ""} onChange={change("month")} disabled={!ready} className={selectClass}>
                    {!ready && <option value="">Month</option>}
                    {MONTHS.map((name, i) => (
                        <option
                            key={name}
                            value={i + 1}
                            disabled={
                                ready && outOfRange(toIsoDate(year, i + 1, Math.min(day, daysInMonth(year, i + 1))))
                            }
                        >
                            {name}
                        </option>
                    ))}
                </select>
                <Chevron />
            </label>
            <label className="relative flex items-center">
                <span className="sr-only">Day</span>
                <select value={ready ? day : ""} onChange={change("day")} disabled={!ready} className={selectClass}>
                    {!ready && <option value="">Day</option>}
                    {range(1, ready ? daysInMonth(year, month) : 31).map((d) => (
                        <option key={d} value={d} disabled={ready && outOfRange(toIsoDate(year, month, d))}>
                            {d}
                        </option>
                    ))}
                </select>
                <Chevron />
            </label>
            <label className="relative flex items-center">
                <span className="sr-only">Year</span>
                <select value={ready ? year : ""} onChange={change("year")} disabled={!ready} className={selectClass}>
                    {!ready && <option value="">Year</option>}
                    {range(lowest.year, highest.year)
                        .reverse()
                        .map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                </select>
                <Chevron />
            </label>
        </div>
    );
}
