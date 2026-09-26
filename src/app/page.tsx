'use client';
// import { BirthdayBeat } from "@/components/BirthdayBeat";
import { Song } from "@/lib/spotify";
import { useRef, useState } from "react";

interface SongResult extends Song {
    chartDate: string;
    videoId: string | null;
}

export default function Home() {
    const [date, setDate] = useState("1993-03-26");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [songData, setSongData] = useState<null | SongResult>(null); 
    const resultsRef = useRef(null); 
    const errorRef = useRef(null); 

    const handleDateChange = (e) => {
        setDate(e.target.value); 
    }

    const onDateSubmit = async (e) => {
        e.preventDefault(); 
        setLoading(true); 
        setError(null); 
        const response = await fetch(`/api/song?date=${date}`);

    if (!response.ok) {
        const data = await response.json(); 
        setLoading(false); 
        setSongData(null); 
        setError(`${response.status} - ${data.message}`);
        return; 
    }

    setSongData(await response.json()); 
    setLoading(false); 
    }

    return (
        <div className="flex flex-col flex-1 items-center justify-center font-sans dark:bg-black outline-amber-400">
            <main className="flex flex-col flex-1 border border-amber-400 items-center justify-center">
            <form action="" id="date" onSubmit={onDateSubmit}>
            <input type="date" name="date-picker" id="date-picker" value={date} onChange={handleDateChange} className=""/>
            <button type="submit" form="date">Go!</button>
            </form>
            
            <div className="results">
                <div ref={resultsRef}>
                    {songData && (
                        <>
                        <img src={songData.albumArt} alt={songData.title}></img>
                    <iframe src={"https://open.spotify.com/embed/track/" + songData.id}
                    width="100%" height="152" allow="encrypted-media" />
                    </>
                )
            }

                </div>
            </div>
            <div className="error">
                {error && (
                    <>
                    {JSON.stringify(error, null, 1)}
                    </>
                )}
            </div>
            </main>
        </div>
    );
}
