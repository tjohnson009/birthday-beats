"use client";
import { ReactElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { countWeeksAtNumberOne, type StripData } from "@/lib/chartStrip";
import { formatLongDate } from "@/lib/dates";

type ChartStripProps = {
    data: StripData;
    week: number; // changes from outside (the date picker, a chip) slide the strip there quietly
    onMove: (week: number) => void; // the person is moving the strip
    onRest: (week: number) => void; // the person let the strip come to rest on a week
};

const WEEK_PX = 4;
const FRICTION = 0.96; // share of a fling's speed kept each 60fps frame; closer to 1 glides longer
const MIN_SPEED = 0.02; // px per ms; slower than this and the glide ends
const SNAP_MS = 240;
const FAR_WEEKS = 600; // jumps farther than this land instantly instead of sliding through every year

// every #1 since 1958 as a strip of blocks, one per run at #1, that slides under a fixed needle.
// a mouse fling keeps gliding and slows down like a wheel; every kind of scroll then eases onto a week
export default function ChartStrip({ data, week, onMove, onRest }: ChartStripProps): ReactElement {
    const { dates, weekRun, runs } = data;
    const weeks = dates.length;
    const trackRef = useRef<HTMLDivElement>(null);
    const [half, setHalf] = useState(0);
    const [shown, setShown] = useState(week);

    // the latest props and position, for event handlers that are bound once.
    // agreed is the last week the strip and its parent both know about
    const latest = useRef({ onMove, onRest, shown, agreed: week, quiet: true });
    useLayoutEffect(() => {
        latest.current.onMove = onMove;
        latest.current.onRest = onRest;
    });

    const blocks = useMemo(() => {
        const spans: ReactElement[] = [];
        let start = 0;
        for (const [i, [song, artist, n]] of runs.entries()) {
            const hue = 225 - (65 * start) / weeks; // blue in 1958 to green today
            spans.push(
                <span
                    key={i}
                    title={`${song} · ${artist}`}
                    className="h-full shrink-0 border-r border-surface"
                    style={{
                        width: n * WEEK_PX,
                        background: `hsl(${hue} 70% var(${i % 2 ? "--strip-dark" : "--strip-light"}))`,
                    }}
                />,
            );
            start += n;
        }
        return spans;
    }, [runs, weeks]);

    const counts = useMemo(() => countWeeksAtNumberOne(data), [data]);

    const years = useMemo(() => {
        const marks: { year: string; left: number }[] = [];
        dates.forEach((date, i) => {
            const year = date.slice(0, 4);
            if (marks[marks.length - 1]?.year !== year) marks.push({ year, left: i * WEEK_PX });
        });
        return marks;
    }, [dates]);

    // pad both ends by half the track so the first and last weeks can reach the needle
    useEffect(() => {
        const track = trackRef.current!;
        const observer = new ResizeObserver(() => setHalf(track.clientWidth / 2));
        observer.observe(track);
        return () => observer.disconnect();
    }, []);

    // once the padding has rendered, put the current week back under the needle
    useLayoutEffect(() => {
        if (!half) return;
        latest.current.quiet = true;
        trackRef.current!.scrollLeft = latest.current.shown * WEEK_PX + WEEK_PX / 2;
    }, [half]);

    // follow the date picker and chips without counting it as the person browsing. a fast fling reports
    // weeks quicker than React re-renders, so a week that comes back late is our own move, not a new one
    useEffect(() => {
        const track = trackRef.current!;
        if (week === latest.current.agreed) return;
        latest.current.agreed = week;
        if (week === latest.current.shown) return;
        latest.current.quiet = true;
        const far = Math.abs(week - latest.current.shown) > FAR_WEEKS;
        track.scrollTo({ left: week * WEEK_PX + WEEK_PX / 2, behavior: far ? "auto" : "smooth" });
    }, [week]);

    useEffect(() => {
        const track = trackRef.current!;
        let anim: number | null = null;
        let settleTimer: ReturnType<typeof setTimeout> | undefined;
        let drag: { x: number; left: number; samples: { x: number; t: number }[] } | null = null;

        const weekAt = () => Math.min(weeks - 1, Math.max(0, Math.floor(track.scrollLeft / WEEK_PX)));
        const nearestWeek = () =>
            Math.min(weeks - 1, Math.max(0, Math.round((track.scrollLeft - WEEK_PX / 2) / WEEK_PX)));
        const maxLeft = () => track.scrollWidth - track.clientWidth;
        const stop = () => {
            if (anim) cancelAnimationFrame(anim);
            anim = null;
        };
        const byPerson = () => {
            latest.current.quiet = false;
        };

        const settle = () => {
            if (latest.current.quiet) {
                latest.current.quiet = false;
                return;
            }
            latest.current.onRest(weekAt());
        };
        const snap = () => {
            stop();
            const from = track.scrollLeft;
            const distance = nearestWeek() * WEEK_PX + WEEK_PX / 2 - from;
            if (Math.abs(distance) < 0.5) return settle();
            const startedAt = performance.now();
            const step = (now: number) => {
                const progress = Math.min(1, (now - startedAt) / SNAP_MS);
                track.scrollLeft = from + distance * (1 - Math.pow(1 - progress, 3));
                if (progress < 1) anim = requestAnimationFrame(step);
                else {
                    anim = null;
                    settle();
                }
            };
            anim = requestAnimationFrame(step);
        };
        // speed is px per ms; positive moves toward today
        const glide = (speed: number) => {
            stop();
            let position = track.scrollLeft;
            let last = performance.now();
            const step = (now: number) => {
                const elapsed = now - last;
                last = now;
                speed *= Math.pow(FRICTION, elapsed / (1000 / 60)); // the same slowdown at any frame rate
                position = Math.min(maxLeft(), Math.max(0, position + speed * elapsed));
                track.scrollLeft = position;
                if (Math.abs(speed) > MIN_SPEED && position !== 0 && position !== maxLeft()) {
                    anim = requestAnimationFrame(step);
                } else {
                    anim = null;
                    snap();
                }
            };
            anim = requestAnimationFrame(step);
        };

        const onScroll = () => {
            const current = weekAt();
            if (current !== latest.current.shown) {
                latest.current.shown = current;
                setShown(current);
                if (!latest.current.quiet) {
                    latest.current.agreed = current;
                    latest.current.onMove(current);
                }
            }
            if (drag || anim) return; // a fling or snap we're running settles itself
            clearTimeout(settleTimer); // trackpads, touch, wheels and keys snap once they go quiet
            settleTimer = setTimeout(snap, 150);
        };
        const onPointerDown = (e: PointerEvent) => {
            byPerson();
            if (e.pointerType !== "mouse") return; // touch scrolls (and glides) natively
            stop();
            clearTimeout(settleTimer);
            drag = { x: e.clientX, left: track.scrollLeft, samples: [{ x: e.clientX, t: e.timeStamp }] };
            track.setPointerCapture(e.pointerId);
            track.dataset.dragging = "true";
        };
        const onPointerMove = (e: PointerEvent) => {
            if (!drag) return;
            track.scrollLeft = drag.left - (e.clientX - drag.x);
            drag.samples.push({ x: e.clientX, t: e.timeStamp });
            while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > 100) drag.samples.shift();
        };
        const onPointerUp = (e: PointerEvent) => {
            if (!drag) return;
            const first = drag.samples[0];
            const last = drag.samples[drag.samples.length - 1];
            const elapsed = last.t - first.t;
            // speed over the last ~100ms; holding still before letting go means no fling
            const speed = elapsed > 0 && e.timeStamp - last.t < 80 ? -(last.x - first.x) / elapsed : 0;
            drag = null;
            delete track.dataset.dragging;
            if (Math.abs(speed) > MIN_SPEED) glide(speed);
            else snap();
        };
        const onWheel = (e: WheelEvent) => {
            byPerson();
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // trackpad sideways swipes scroll natively
            track.scrollLeft += e.deltaY;
            e.preventDefault();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            const step = e.shiftKey ? 52 : 1;
            const moves: Record<string, number> = { ArrowLeft: -step, ArrowRight: step, Home: -weeks, End: weeks };
            if (!(e.key in moves)) return;
            e.preventDefault();
            byPerson();
            stop();
            const target = Math.min(weeks - 1, Math.max(0, weekAt() + moves[e.key]));
            track.scrollTo({ left: target * WEEK_PX + WEEK_PX / 2 });
        };

        track.addEventListener("scroll", onScroll);
        track.addEventListener("pointerdown", onPointerDown);
        track.addEventListener("pointermove", onPointerMove);
        track.addEventListener("pointerup", onPointerUp);
        track.addEventListener("pointercancel", onPointerUp);
        track.addEventListener("wheel", onWheel, { passive: false });
        track.addEventListener("keydown", onKeyDown);
        return () => {
            stop();
            clearTimeout(settleTimer);
            track.removeEventListener("scroll", onScroll);
            track.removeEventListener("pointerdown", onPointerDown);
            track.removeEventListener("pointermove", onPointerMove);
            track.removeEventListener("pointerup", onPointerUp);
            track.removeEventListener("pointercancel", onPointerUp);
            track.removeEventListener("wheel", onWheel);
            track.removeEventListener("keydown", onKeyDown);
        };
    }, [weeks]);

    const [song, artist] = runs[weekRun[shown]];
    const total = counts.total[shown];
    const weekLine = total === 1 ? "1 week at #1" : `Week ${counts.nth[shown]} of ${total} at #1`;
    const label = `${formatLongDate(dates[shown])}: ${song} by ${artist}, ${weekLine}`;

    return (
        <div className="flex w-full max-w-4xl flex-col gap-2">
            {/* room is kept for a two-line title on phones, and the text sits on the strip's top edge,
                so changing titles don't nudge the strip up and down mid-drag */}
            <div className="flex min-h-21 flex-col items-center justify-end gap-0.5 text-center text-sm text-muted sm:min-h-16">
                <p>#1 the week of {formatLongDate(dates[shown])}</p>
                <p className="font-medium text-foreground text-balance">
                    {song} · {artist}
                </p>
                <p className="text-xs">{weekLine}</p>
            </div>
            <div className="relative">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1.5 bottom-7 left-1/2 z-10 -ml-[1.5px] w-[3px] rounded-full bg-foreground before:absolute before:-top-1.5 before:left-1/2 before:-ml-1.5 before:border-[6px] before:border-transparent before:border-t-foreground"
                />
                <div
                    ref={trackRef}
                    tabIndex={0}
                    role="slider"
                    aria-label="Browse every #1 by week"
                    aria-valuemin={0}
                    aria-valuemax={weeks - 1}
                    aria-valuenow={shown}
                    aria-valuetext={label}
                    className="cursor-grab touch-pan-x overflow-x-auto overflow-y-hidden rounded-2xl border border-line bg-surface [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-brand-blue data-[dragging]:cursor-grabbing [&::-webkit-scrollbar]:hidden"
                >
                    <div className="relative h-20" style={{ width: weeks * WEEK_PX + 2 * half }}>
                        <div className="absolute top-3 flex h-9" style={{ left: half }}>
                            {blocks}
                        </div>
                        <div className="absolute top-[3.25rem] h-6" style={{ left: half }}>
                            {years.map(({ year, left }) => {
                                const decade = Number(year) % 10 === 0;
                                return (
                                    <span key={year}>
                                        <i
                                            className={`absolute top-0 w-px bg-muted ${decade ? "h-2.5" : "h-1.5 opacity-50"}`}
                                            style={{ left }}
                                        />
                                        <b
                                            className={`absolute top-2.5 -translate-x-1/2 text-[11px] tabular-nums ${decade ? "font-bold text-foreground" : "font-normal text-muted"}`}
                                            style={{ left }}
                                        >
                                            {year}
                                        </b>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
