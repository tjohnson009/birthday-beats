import { NextRequest, NextResponse } from "next/server";
import { getNumberOneSongForDate } from "@/lib/billboard";
import { lookupYoutubeVideoForSong } from "@/lib/youtube";
import { getCachedSong } from "@/lib/songCache";
import { logSearch } from "@/lib/events";

export async function GET(request: NextRequest) {
    const date = request.nextUrl.searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        return NextResponse.json({ message: "Missing or invalid date — expected YYYY-MM-DD." }, { status: 400 });
    }

    const logAttempt = async (found: boolean) => {
        try {
            await logSearch(date, found);
        } catch (error) {
            console.error("Event log failed:", error);
        }
    };

    const numberOne = getNumberOneSongForDate(date);

    if (!numberOne) {
        await logAttempt(false);
        return NextResponse.json({ message: "Could not find a song for that date." }, { status: 404 });
    }

    let songData;
    try {
        songData = await getCachedSong(numberOne.song, numberOne.artist); // calls searchSong if cache read fails
    } catch (error) {
        console.error("Spotify search failed:", error);
        return NextResponse.json(
            { message: "Having trouble reaching Spotify right now — try again in a minute." },
            { status: 503 }
        );
    }
    const youtubeVideoInfo = lookupYoutubeVideoForSong(numberOne.song, numberOne.artist);

    if (!songData) {
        await logAttempt(false);
        return NextResponse.json({ message: "Could not find song data from Spotify." }, { status: 404 });
    }

    await logAttempt(true);
    return NextResponse.json({
        chartDate: numberOne.date,
        ...songData,
        videoId: youtubeVideoInfo?.videoId ?? null,
    });
}
