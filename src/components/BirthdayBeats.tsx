"use client";
import Loading from "@/components/Loading";
import { Song } from "@/lib/spotify";
import React, { useState, useSyncExternalStore } from "react";
import ErrorMessage, { type SearchError } from "@/components/ErrorMessage";
import SongInfo from "@/components/SongInfo";
import DatePicker from "@/components/DatePicker";
import QuickPicks from "@/components/QuickPicks";
import HeroTitles from "@/components/HeroTitles";
import { resultArea, resultGrid } from "@/components/resultLayout";
import { display, roboto } from "@/lib/fonts";
import { FIRST_CHART_DATE, randomIsoDateBetween } from "@/lib/dates";

export interface SongResult extends Song {
    chartDate: string;
    videoId: string | null;
}

type BirthdayBeatsProps = {
    heroTitles: string[];
};

const subscribe = () => {
    return () => {};
};

const getToday = () => {
    return new Date().toLocaleDateString("en-CA");
};

const getServerToday = () => "";

const toSearchError = async (response: Response, searchDate: string): Promise<SearchError> => {
    if (response.status === 503) return { kind: "spotify" };
    if (response.status === 404 && searchDate < FIRST_CHART_DATE) return { kind: "too-early" };

    let message = "Something went wrong. Please try again in a minute.";
    try {
        message = (await response.json()).message;
    } catch {}
    return { kind: "other", message };
};

export default function BirthdayBeats({ heroTitles }: BirthdayBeatsProps) {
    const today = useSyncExternalStore(subscribe, getToday, getServerToday);

    const [date, setDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<SearchError | null>(null);
    const [songData, setSongData] = useState<null | SongResult>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const selectedDate = date ?? today;
    // const resultsRef = useRef<HTMLDivElement | null>(null)

    const search = async (searchDate: string) => {
        setDate(searchDate);
        setHasSearched(true);
        setLoading(true);
        setError(null);
        setSongData(null);
        try {
            const response = await fetch(`/api/song?date=${searchDate}`);

            if (!response.ok) {
                setError(await toSearchError(response, searchDate));
                return;
            }

            setSongData(await response.json());
            // resultsRef.current?.scrollIntoView({ behavior: "smooth" })
        } catch {
            setError({ kind: "network" });
        } finally {
            setLoading(false);
        }
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
                <HeroTitles titles={heroTitles} hidden={hasSearched} />

                {/* intro: fades and slides up, collapsing its space, once the first search is submitted */}
                <div
                    className={`${roboto.className} grid w-full max-w-lg px-4 text-center transition-all transition-discrete duration-500 ease-out ${
                        hasSearched ? "grid-rows-[0fr] opacity-0 -translate-y-2 hidden" : "grid-rows-[1fr] opacity-100"
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
                            in the US on the day you were born?
                        </h1>
                        <p id="intro" className="mt-3 text-muted">
                            Or the day you graduated, said &quot;I do,&quot; or got your first car? Pick any date back
                            to August 1958, press Go, and hear that week&apos;s Billboard #1.
                        </p>
                    </div>
                </div>

                <form
                    action=""
                    id="date"
                    className={`${roboto.className} flex flex-col items-center gap-4 px-4`}
                    onSubmit={onDateSubmit}
                >
                    <div
                        role="group"
                        aria-labelledby="date-label"
                        aria-describedby="intro"
                        className="flex flex-col items-center gap-2"
                    >
                        <p id="date-label" className="text-center text-sm text-muted text-balance">
                            Your birthday, or any day that matters to you
                        </p>
                        {/* under 360px the date and the Go button don't fit on one line, so Go drops below at full width */}
                        <div className="flex flex-wrap items-center justify-center gap-1 rounded-3xl border border-line bg-surface p-2 shadow-sm">
                            <DatePicker
                                value={selectedDate}
                                min={FIRST_CHART_DATE}
                                max={today}
                                onChange={setDate}
                                className="text-base sm:text-lg"
                            />
                            <button
                                type="submit"
                                className="ml-1 rounded-2xl px-5 py-2.5 text-lg text-white font-medium bg-green-600 hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 hover:cursor-pointer sm:px-6 max-[359px]:ml-0 max-[359px]:w-full"
                                form="date"
                            >
                                Go!
                            </button>
                        </div>
                    </div>
                    {!hasSearched && <QuickPicks today={today} onPick={search} />}
                </form>

                {loading && <Loading />}

                <div className="results w-full">
                    {songData && (
                        <div className={resultGrid}>
                            <div className={`${resultArea.art} mx-auto w-full max-w-md`}>
                                <img
                                    src={songData.albumArt ?? "/audio-placeholder.png"}
                                    alt={songData.title}
                                    className="relative aspect-square w-full rounded-2xl shadow-2xl shadow-black/25 animate-reveal motion-reduce:animate-none"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/audio-placeholder.png";
                                    }}
                                />
                            </div>
                            <div className={resultArea.info}>
                                <SongInfo songData={songData} />
                            </div>
                            {songData?.videoId && (
                                <iframe
                                    src={"https://www.youtube.com/embed/" + songData?.videoId}
                                    title={`${songData.title} music video`}
                                    allowFullScreen
                                    className={`${resultArea.video} aspect-video w-full rounded-xl lg:mx-auto lg:max-w-3xl`}
                                />
                            )}
                            <iframe
                                src={"https://open.spotify.com/embed/track/" + songData.id}
                                title={`${songData.title} on Spotify`}
                                width="100%"
                                height="152"
                                allow="encrypted-media"
                                className={`${resultArea.spotify} rounded-xl`}
                            />
                        </div>
                    )}
                </div>
                <div className="error">
                    {error && (
                        <ErrorMessage
                            error={error}
                            onRetry={() => search(selectedDate)}
                            onTryDate={search}
                            onSurprise={surprise}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
