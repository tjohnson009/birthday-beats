import React, { ReactElement } from "react";
import { display } from "@/lib/fonts";
import { FIRST_CHART_DATE, formatLongDate } from "@/lib/dates";

export type SearchError = { kind: "too-early" } | { kind: "network" } | { kind: "other"; message: string };

type ErrorMessageProps = {
    error: SearchError;
    onRetry: () => void;
    onTryDate: (date: string) => void;
    onSurprise: () => void;
};

// every message says what happened and offers one way forward
export default function ErrorMessage({ error, onRetry, onTryDate, onSurprise }: ErrorMessageProps): ReactElement {
    const content = {
        "too-early": {
            title: `The Hot 100 started on ${formatLongDate(FIRST_CHART_DATE)}`,
            detail: "There's no #1 song before then.",
            action: { label: `Try ${formatLongDate(FIRST_CHART_DATE)}`, run: () => onTryDate(FIRST_CHART_DATE) },
        },
        network: {
            title: "Can't reach Birthday Beats",
            detail: "Check your connection, then try again.",
            action: { label: "Try again", run: onRetry },
        },
        other: {
            title: "We couldn't load that song",
            detail: error.kind === "other" ? error.message : "",
            action: { label: "Try a random date", run: onSurprise },
        },
    }[error.kind];

    return (
        <div role="alert" className="mx-4 flex max-w-md flex-col items-center gap-2 text-center">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-9 w-9 text-muted"
                fill="none"
                stroke="currentColor"
            >
                <circle cx="12" cy="12" r="9" strokeWidth="1.6" />
                <path d="M12 7.5v5.5" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16.25" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            <p className={`${display.className} text-lg font-extrabold text-balance`}>{content.title}</p>
            <p className="text-muted">{content.detail}</p>
            <button
                type="button"
                onClick={content.action.run}
                className="mt-2 rounded-xl border border-line bg-surface px-4 py-2 font-medium hover:border-brand-blue hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
                {content.action.label}
            </button>
        </div>
    );
}
