"use client";
import Loading from "@/components/Loading";
import { Song } from "@/lib/spotify";
import React, { useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import SongInfo from "@/components/SongInfo";
import { roboto } from "@/lib/fonts";

export interface SongResult extends Song {
    chartDate: string;
    videoId: string | null;
}

export default function Home() {
    const today = new Date().toLocaleDateString("en-CA");

    const [date, setDate] = useState<string>(today);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [songData, setSongData] = useState<null | SongResult>(null);
    // const resultsRef = useRef<HTMLDivElement | null>(null)

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.currentTarget.value);
    };

    const onDateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSongData(null);
        try {
            const response = await fetch(`/api/song?date=${date}`);

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
                <form action="" id="date" className="flex mx-auto gap-2" onSubmit={onDateSubmit}>
                    <input
                        type="date"
                        max={today}
                        name="date-picker"
                        id="date-picker"
                        value={date}
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
