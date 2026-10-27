"use client";
import Loading from "@/components/Loading";
import { Song } from "@/lib/spotify";
import React, { useState, useSyncExternalStore } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import SongInfo from "@/components/SongInfo";
import { roboto } from "@/lib/fonts";

export interface SongResult extends Song {
    chartDate: string;
    videoId: string | null;
}

const subscribe = () => {
    return () => {};
};

const getToday = () => {
    return new Date().toLocaleDateString("en-CA");
};

const getServerToday = () => "";

export default function Home() {
    const today = useSyncExternalStore(subscribe, getToday, getServerToday);

    const [date, setDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [songData, setSongData] = useState<null | SongResult>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const selectedDate = date ?? today;
    // const resultsRef = useRef<HTMLDivElement | null>(null)

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.currentTarget.value);
    };

    const onDateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setHasSearched(true);
        setLoading(true);
        setError(null);
        setSongData(null);
        try {
            const response = await fetch(`/api/song?date=${selectedDate}`);

            if (!response.ok) {
                let message = "Something went wrong. Please try again in a minute.";
                try {
                    message = (await response.json()).message;
                } catch {}
                setError(message);
                return;
            }

            setSongData(await response.json());
            // resultsRef.current?.scrollIntoView({ behavior: "smooth" })
        } catch {
            setError("Could not reach the server — check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black">
            <main className="flex flex-col flex-1 items-center justify-center w-full py-4 gap-5.5">
                {/* intro: fades and slides up, collapsing its space, once the first search is submitted */}
                <div
                    className={`${roboto.className} grid w-full max-w-md px-4 text-center transition-all transition-discrete duration-500 ease-out ${
                        hasSearched ? "grid-rows-[0fr] opacity-0 -translate-y-2 hidden" : "grid-rows-[1fr] opacity-100"
                    }`}
                >
                    <div className="overflow-hidden">
                        <h1 className="text-2xl font-bold">What was the #1 song in the US on the day you were born?</h1>
                        <p id="intro" className="mt-2 text-neutral-600 dark:text-neutral-400">
                            Or the day you graduated, said &quot;I do,&quot; or got your first car? Pick any date back to
                            August 1958, press Go, and hear that week&apos;s Billboard #1.
                        </p>
                    </div>
                </div>
                <form action="" id="date" className="flex mx-auto gap-2" onSubmit={onDateSubmit}>
                    <input
                        type="date"
                        max={today}
                        name="date-picker"
                        id="date-picker"
                        aria-describedby="intro"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className={`${roboto.className} px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700               
  bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 scheme-light dark:scheme-dark hover:cursor-pointer`}
                    />
                    <button
                        type="submit"
                        className="rounded-lg px-4 py-2 text-white font-medium bg-green-600 hover:bg-green-700 hover:cursor-pointer"
                        form="date"
                    >
                        Go!
                    </button>
                </form>

                {loading && <Loading />}

                <div className="results">
                    <div className="flex flex-col w-full gap-5.5 max-w-xl mx-auto px-4">
                        {/* {songData && (
                            <div className="flex">
                                {}
                            </div>
                        )} */}
                        {songData && (
                            <>
                                <img
                                    src={songData.albumArt ?? "/audio-placeholder.png"}
                                    alt={songData.title}
                                    className="aspect-square w-full"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = "/audio-placeholder.png";
                                    }}
                                />
                                <SongInfo songData={songData} />
                                {songData?.videoId && (
                                    <iframe
                                        src={"https://www.youtube.com/embed/" + songData?.videoId}
                                        allowFullScreen
                                        className="aspect-video w-full"
                                    />
                                )}
                                <iframe
                                    src={"https://open.spotify.com/embed/track/" + songData.id}
                                    width="100%"
                                    height="152"
                                    allow="encrypted-media"
                                />
                            </>
                        )}
                    </div>
                </div>
                <div className="error">{error && <ErrorMessage message={error} />}</div>
            </main>
        </div>
    );
}
