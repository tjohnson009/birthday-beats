import React, { ReactElement } from "react";
import { resultArea, resultGrid } from "@/components/resultLayout";

// a gray placeholder shaped like the result, so nothing jumps when the song arrives
export default function Loading(): ReactElement {
    return (
        <div role="status" className={`${resultGrid} w-full`}>
            <div
                className={`${resultArea.art} mx-auto aspect-square w-full max-w-md rounded-2xl bg-line/50 animate-pulse motion-reduce:animate-none`}
            />

            <div className={`${resultArea.info} flex flex-col items-center gap-3 lg:items-start`}>
                <div className="h-7 w-64 rounded-lg bg-line/70 animate-pulse motion-reduce:animate-none" />
                <div className="h-5 w-40 rounded-lg bg-line/70 animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-56 rounded-lg bg-line/70 animate-pulse motion-reduce:animate-none" />
                <div className="mt-2 flex items-center gap-3 text-muted">
                    <span aria-hidden="true" className="flex h-5 items-end gap-1">
                        {[0, 150, 300].map((delay) => (
                            <span
                                key={delay}
                                className="h-full w-1.5 origin-bottom rounded-full bg-linear-to-t from-brand-blue to-brand-green animate-eq motion-reduce:animate-none"
                                style={{ animationDelay: `${delay}ms` }}
                            />
                        ))}
                    </span>
                    <p>Searching for song...</p>
                </div>
            </div>

            <div
                className={`${resultArea.spotify} h-[152px] w-full rounded-xl bg-line/50 animate-pulse motion-reduce:animate-none`}
            />
        </div>
    );
}
