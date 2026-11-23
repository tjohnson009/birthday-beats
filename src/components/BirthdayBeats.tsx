"use client";
import Loading from "@/components/Loading";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ErrorMessage, { type SearchError } from "@/components/ErrorMessage";
import SongInfo from "@/components/SongInfo";
import DatePicker from "@/components/DatePicker";
import QuickPicks from "@/components/QuickPicks";
import HeroTitles from "@/components/HeroTitles";
import ChartStrip from "@/components/ChartStrip";
import BirthdaySwitch, { type BirthdayView } from "@/components/BirthdaySwitch";
import ShareSheet from "@/components/ShareSheet";
import { resultArea, resultGrid } from "@/components/resultLayout";
import { display, roboto } from "@/lib/fonts";
import {
    FIRST_CHART_DATE,
    TREND_AGE,
    checkNthBirthday,
    clampIsoDate,
    formatShortDate,
    nthBirthday,
    randomIsoDateBetween,
} from "@/lib/dates";
import { weekForDate, type StripData } from "@/lib/chartStrip";
import type { SongResult } from "@/lib/songResult";
import { parseSharedResult } from "@/lib/share";

type BirthdayBeatsProps = {
    heroTitles: string[];
    trend?: boolean; // the /17 page: Go shows the #1 from the 17th birthday
};

// a strip stop on a song that isn't saved yet waits this long, still, before asking Spotify for its details
const DETAILS_DELAY_MS = 2000;
const PLACEHOLDER_ART = "/audio-placeholder.png";

const subscribe = () => {
    return () => {};
};

const getToday = () => {
    return new Date().toLocaleDateString("en-CA");
};

const getServerToday = () => "";

const getAddressSearch = () => window.location.search;

const getServerAddressSearch = () => "";

const toSearchError = async (response: Response, searchDate: string): Promise<SearchError> => {
    if (response.status === 404 && searchDate < FIRST_CHART_DATE) return { kind: "too-early" };

    let message = "Something went wrong. Please try again in a minute.";
    try {
        const body = await response.json();
        if (typeof body?.message === "string" && body.message) message = body.message;
    } catch {}
    return { kind: "other", message };
};

export default function BirthdayBeats({ heroTitles, trend = false }: BirthdayBeatsProps) {
    const today = useSyncExternalStore(subscribe, getToday, getServerToday);

    const [date, setDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // a strip stop is loading over the current result
    const [error, setError] = useState<SearchError | null>(null);
    const [songData, setSongData] = useState<null | SongResult>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [stripData, setStripData] = useState<StripData | null>(null);
    // the date the strip sits on: the song on screen, or where the person moved the strip. it stays
    // put when the picker changes, and is empty until the first search so the strip doesn't give it away
    const [stripDate, setStripDate] = useState<string | null>(null);
    // the birthday behind the result on screen, and whether it shows that day's #1 or the 17th birthday's
    const [birthday, setBirthday] = useState<string | null>(null);
    const [view, setView] = useState<BirthdayView>("born");
    const [sharing, setSharing] = useState(false);
    // the share sheet's escape buttons reopen this page with ?week=&year=&kind=&share=1: that week's song,
    // with the sheet open. read in the browser, so the page itself stays static
    const addressSearch = useSyncExternalStore(subscribe, getAddressSearch, getServerAddressSearch);
    const shared = useMemo(() => parseSharedResult(addressSearch), [addressSearch]);
    // results already fetched for this birthday, so switching back doesn't ask again
    const savedResults = useRef<Partial<Record<BirthdayView, SongResult>>>({});
    // one lookup at a time: a newer search, switch, or strip stop cancels the one before it
    const songRequest = useRef<AbortController | null>(null);
    // the last Go or switch lookup, so "Try again" repeats that one (strip stops leave it empty)
    const lastLookup = useRef<{ date: string; view: BirthdayView } | null>(null);
    // set by Go and the switch so the new song gets scrolled into view; strip stops don't scroll
    const scrollToResult = useRef(false);
    const resultTopRef = useRef<HTMLDivElement | null>(null);
    const detailsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const selectedDate = date ?? today;
    const seventeenth = birthday && nthBirthday(birthday, TREND_AGE);
    const seventeenthCheck = birthday && today ? checkNthBirthday(birthday, TREND_AGE, today) : "future";
    const futureNote = trend && view === "born" && seventeenthCheck === "future";
    // /17 takes birthdays from 17 years before the first chart, whose 17th birthday does have one
    const earliestDate = trend ? nthBirthday(FIRST_CHART_DATE, -TREND_AGE) : FIRST_CHART_DATE;
    // the switch and Share belong to the birthday on screen; once the picker moves to another date, they wait for Go
    const pickerMatchesResult = birthday !== null && selectedDate === birthday;
    const searched = hasSearched || shared !== null;
    const sharedLoading = shared !== null && !songData && !error;
    // a shared link counts as the first search, once its song is on screen
    const stripAt = stripDate ?? (shared && songData ? shared.week : null);
    // what Share hands over: the shared result, or the birthday result on screen
    const shareTarget = shared
        ? { year: shared.year, kind: shared.kind }
        : birthday && seventeenth
          ? { year: (view === "seventeen" ? seventeenth : birthday).slice(0, 4), kind: view }
          : null;

    // on phones the result sits below the picker and strip, so bring a new Go or switch result into view
    useEffect(() => {
        if (!songData || !scrollToResult.current) return;
        scrollToResult.current = false;
        const top = resultTopRef.current;
        if (!top || top.getBoundingClientRect().top < window.innerHeight * 0.4) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        top.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, [songData]);

    // the strip is extra: if its data can't load, the date picker works on its own
    useEffect(() => {
        fetch("/api/chart")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => data && setStripData(data))
            .catch(() => {});
    }, []);

    const cancelSongLoad = () => {
        clearTimeout(detailsTimer.current);
        songRequest.current?.abort();
        songRequest.current = null;
        setLoading(false);
        setRefreshing(false);
    };

    // looks up one date for Go or the switch, and shows it as the given view
    const showSong = async (lookupDate: string, nextView: BirthdayView) => {
        cancelSongLoad();
        const controller = new AbortController();
        songRequest.current = controller;
        setHasSearched(true);
        setLoading(true);
        setError(null);
        setSongData(null);
        setView(nextView);
        lastLookup.current = { date: lookupDate, view: nextView };
        try {
            const response = await fetch(`/api/song?date=${lookupDate}`, { signal: controller.signal });

            if (!response.ok) {
                setError(await toSearchError(response, lookupDate));
                return;
            }

            const result: SongResult = await response.json();
            savedResults.current[nextView] = result;
            scrollToResult.current = true;
            setSongData(result);
            // only now: moving the strip any earlier would name the song before its reveal
            setStripDate(lookupDate);
        } catch {
            if (!controller.signal.aborted) setError({ kind: "network" });
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    };

    // load the shared week's song, then open the sheet. until it comes back, the page already looks like a
    // result is on its way (see searched and sharedLoading)
    useEffect(() => {
        if (!shared) return;
        const controller = new AbortController();
        songRequest.current = controller;
        lastLookup.current = { date: shared.week, view: shared.kind };
        fetch(`/api/song?date=${shared.week}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) return setError(await toSearchError(response, shared.week));
                const result: SongResult = await response.json();
                scrollToResult.current = true;
                setSongData(result);
                setSharing(true);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError({ kind: "network" });
            });
        return () => controller.abort();
    }, [shared]);

    // a new search or strip stop leaves the shared result behind. dropping it from the address is enough:
    // the next render reads the address again
    const leaveSharedResult = () => {
        if (shared) window.history.replaceState(null, "", window.location.pathname);
    };

    // on /17, Go jumps straight to the 17th birthday, unless it hasn't happened yet
    const search = (searchDate: string) => {
        leaveSharedResult();
        setDate(searchDate);
        setBirthday(searchDate);
        savedResults.current = {};
        if (trend && today && checkNthBirthday(searchDate, TREND_AGE, today) === "ok")
            showSong(nthBirthday(searchDate, TREND_AGE), "seventeen");
        else showSong(searchDate, "born");
    };

    const toggleView = () => {
        if (!birthday || !seventeenth) return;
        const next = view === "born" ? "seventeen" : "born";
        const nextDate = next === "seventeen" ? seventeenth : birthday;
        const saved = savedResults.current[next];
        if (!saved) return showSong(nextDate, next);
        cancelSongLoad();
        setError(null);
        setStripDate(nextDate);
        scrollToResult.current = true;
        setSongData(saved);
        setView(next);
    };

    // a strip stop: show the song right away from a cache-only peek, which never calls Spotify. if its
    // details aren't saved yet, ask Spotify only once the strip has stayed put a moment longer
    const loadFromStrip = async (week: number) => {
        if (!stripData) return;
        cancelSongLoad();
        leaveSharedResult();
        const stopDate = stripData.dates[week];
        // a stop with no move first (a click on a shared result) still needs this, or the strip goes away
        setStripDate(stopDate);
        const controller = new AbortController();
        songRequest.current = controller;
        // browsing the strip treats each stop as the birthday
        setBirthday(clampIsoDate(stopDate, FIRST_CHART_DATE, today));
        setView("born");
        savedResults.current = {};
        lastLookup.current = null;
        setHasSearched(true);
        setError(null);
        if (songData) setRefreshing(true);
        else setLoading(true);

        const get = async (mode: string): Promise<SongResult | null> => {
            const response = await fetch(`/api/song?date=${stopDate}&source=strip${mode}`, {
                signal: controller.signal,
            });
            if (response.ok) return response.json();
            setSongData(null);
            setError(await toSearchError(response, stopDate));
            return null;
        };

        try {
            const peek = await get("&mode=peek");
            if (!peek) return;
            setSongData(peek);
            if (peek.spotify || peek.spotifyStatus !== "not-cached") {
                savedResults.current.born = peek;
                return;
            }
            detailsTimer.current = setTimeout(async () => {
                try {
                    const full = await get("");
                    if (!full) return;
                    savedResults.current.born = full;
                    setSongData(full);
                } catch {
                    // moved on, or offline: the peeked song stays on screen
                }
            }, DETAILS_DELAY_MS);
        } catch {
            if (!controller.signal.aborted) setError({ kind: "network" });
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    const moveStrip = (week: number) => {
        cancelSongLoad();
        setStripDate(stripData!.dates[week]);
        // chart weeks are dated ahead, so the newest one can be after today
        setDate(clampIsoDate(stripData!.dates[week], FIRST_CHART_DATE, today));
    };

    const surprise = () => search(randomIsoDateBetween(FIRST_CHART_DATE, today));

    const onDateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        search(selectedDate);
    };

    return (
        <div className="flex flex-col flex-1 items-center justify-center font-sans">
            {/* isolate: the title wall's -z-10 stays behind everything in main, but no further back than main */}
            <main className="relative isolate flex flex-col flex-1 items-center justify-center w-full py-8 gap-6">
                <HeroTitles titles={heroTitles} searched={searched} />

                {/* intro: fades and slides up, collapsing its space, once the first search is submitted */}
                <div
                    className={`${roboto.className} grid w-full max-w-lg px-4 text-center transition-all transition-discrete duration-500 ease-out ${
                        searched ? "grid-rows-[0fr] opacity-0 -translate-y-2 hidden" : "grid-rows-[1fr] opacity-100"
                    }`}
                >
                    <div className="overflow-hidden">
                        <h1
                            className={`${display.className} text-3xl sm:text-4xl font-extrabold leading-tight text-balance`}
                        >
                            What was the{" "}
                            <span className="whitespace-nowrap bg-linear-to-r from-brand-blue to-brand-green bg-clip-text text-transparent">
                                #1 song
                            </span>{" "}
                            {trend ? `on your ${TREND_AGE}th birthday?` : "in the US on the day you were born?"}
                        </h1>
                        <p id="intro" className="mt-3 text-muted">
                            {trend ? (
                                <>
                                    Will 2027 be a party anthem or a breakup song? The trend says it&apos;s whatever hit
                                    #1 when you turned 17. Enter your birthday to see yours.
                                </>
                            ) : (
                                <>
                                    Or the day you graduated, said &quot;I do,&quot; or got your first car? Pick any
                                    date back to August 1958, press Go, and hear that week&apos;s Billboard #1.
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <form
                    action=""
                    id="date"
                    className={`${roboto.className} flex w-full flex-col items-center gap-4 px-4`}
                    onSubmit={onDateSubmit}
                >
                    <div
                        role="group"
                        aria-labelledby="date-label"
                        aria-describedby="intro"
                        className="flex flex-col items-center gap-2"
                    >
                        <p id="date-label" className="text-center text-sm text-muted text-balance">
                            {trend ? "Your birthday" : "Your birthday, or any day that matters to you"}
                        </p>
                        {/* under 360px the date and the Go button don't fit on one line, so Go drops below at full width */}
                        <div className="flex flex-wrap items-center justify-center gap-1 rounded-3xl border border-line bg-surface p-2 shadow-sm">
                            <DatePicker
                                value={selectedDate}
                                min={earliestDate}
                                max={today}
                                onChange={setDate}
                                className="text-base sm:text-lg"
                            />
                            {/* off until the page is ready: before that, a tap would only reload the page */}
                            <button
                                type="submit"
                                disabled={!today}
                                className="ml-1 rounded-2xl px-5 py-2.5 text-lg text-white font-medium bg-green-700 hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 hover:cursor-pointer disabled:opacity-60 disabled:hover:bg-green-700 disabled:cursor-wait sm:px-6 max-[359px]:ml-0 max-[359px]:w-full"
                                form="date"
                            >
                                Go!
                            </button>
                        </div>
                    </div>
                    {stripData && today && stripAt && (
                        <ChartStrip
                            data={stripData}
                            week={weekForDate(stripData.dates, stripAt)}
                            onMove={moveStrip}
                            onRest={loadFromStrip}
                        />
                    )}
                    {/* the picks are dates, not birthdays, so the trend page leaves them out */}
                    {!searched && !trend && <QuickPicks today={today} onPick={search} />}
                </form>

                {birthday && seventeenth && pickerMatchesResult && (
                    <div
                        ref={resultTopRef}
                        className={`${roboto.className} flex scroll-mt-4 flex-col items-center gap-3 px-4 text-center`}
                    >
                        <div className="flex flex-wrap justify-center gap-2">
                            {/* /17 only: the home page is for any date, and its header link leads to /17.
                                the note below already says when they turn 17 */}
                            {trend && !futureNote && (
                                <BirthdaySwitch
                                    view={view}
                                    check={seventeenthCheck}
                                    bornHasChart={birthday >= FIRST_CHART_DATE}
                                    busy={loading}
                                    onToggle={toggleView}
                                />
                            )}
                            {songData && !loading && !refreshing && (
                                <button
                                    type="button"
                                    onClick={() => setSharing(true)}
                                    className="rounded-2xl bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                                >
                                    Share to your Story
                                </button>
                            )}
                        </div>
                        {view === "seventeen" && (
                            <p className={`${display.className} text-lg font-semibold text-balance`}>
                                #1 on your {TREND_AGE}th birthday · {formatShortDate(seventeenth)}
                            </p>
                        )}
                        {futureNote && songData && (
                            <p className="text-sm text-muted text-balance">
                                You turn {TREND_AGE} in {seventeenth.slice(0, 4)}. Here&apos;s the #1 from the day you
                                were born.
                            </p>
                        )}
                    </div>
                )}

                {shared && songData && !loading && (
                    <div
                        ref={resultTopRef}
                        className={`${roboto.className} flex scroll-mt-4 flex-col items-center gap-3 px-4 text-center`}
                    >
                        <button
                            type="button"
                            onClick={() => setSharing(true)}
                            className="rounded-2xl bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-blue/90 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                        >
                            Share to your Story
                        </button>
                        <p className={`${display.className} text-lg font-semibold text-balance`}>
                            {shared.kind === "seventeen"
                                ? `#1 on your ${TREND_AGE}th birthday · ${shared.year}`
                                : `#1 the week you were born · ${shared.year}`}
                        </p>
                    </div>
                )}

                {sharing && shareTarget && songData && (
                    <ShareSheet
                        week={songData.chartDate}
                        year={shareTarget.year}
                        kind={shareTarget.kind}
                        title={songData.title}
                        artist={songData.artist}
                        onClose={() => setSharing(false)}
                    />
                )}

                {(loading || sharedLoading) && <Loading />}

                <div className={`results w-full transition-opacity duration-200 ${refreshing ? "opacity-60" : ""}`}>
                    {songData && (
                        <div className={resultGrid}>
                            <div className={`${resultArea.art} mx-auto w-full max-w-md`}>
                                {!songData.spotify && songData.spotifyStatus === "not-cached" ? (
                                    <div className="aspect-square w-full rounded-2xl bg-line/50 animate-pulse motion-reduce:animate-none" />
                                ) : (
                                    <img
                                        src={songData.spotify?.albumArt ?? PLACEHOLDER_ART}
                                        alt={songData.spotify?.title ?? songData.title}
                                        className="relative aspect-square w-full rounded-2xl shadow-2xl shadow-black/25 animate-reveal motion-reduce:animate-none"
                                        onError={(e) => {
                                            if (!e.currentTarget.src.endsWith(PLACEHOLDER_ART))
                                                e.currentTarget.src = PLACEHOLDER_ART;
                                        }}
                                    />
                                )}
                            </div>
                            <div className={resultArea.info}>
                                <SongInfo songData={songData} />
                            </div>
                            {songData.videoId && (
                                <iframe
                                    src={"https://www.youtube.com/embed/" + songData.videoId}
                                    title={`${songData.title} music video`}
                                    allowFullScreen
                                    className={`${resultArea.video} aspect-video w-full rounded-xl lg:mx-auto lg:max-w-3xl`}
                                />
                            )}
                            {songData.spotify ? (
                                <iframe
                                    src={"https://open.spotify.com/embed/track/" + songData.spotify.id}
                                    title={`${songData.spotify.title} on Spotify`}
                                    width="100%"
                                    height="152"
                                    allow="encrypted-media"
                                    className={`${resultArea.spotify} rounded-xl`}
                                />
                            ) : (
                                songData.spotifyStatus === "not-cached" && (
                                    <div
                                        className={`${resultArea.spotify} h-[152px] rounded-xl bg-line/50 animate-pulse motion-reduce:animate-none`}
                                    />
                                )
                            )}
                        </div>
                    )}
                </div>
                <div className="error">
                    {error && (
                        <ErrorMessage
                            error={error}
                            onRetry={() =>
                                lastLookup.current
                                    ? showSong(lastLookup.current.date, lastLookup.current.view)
                                    : search(selectedDate)
                            }
                            onTryDate={search}
                            onSurprise={surprise}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
