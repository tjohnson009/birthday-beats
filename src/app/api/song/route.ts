import { NextRequest, NextResponse } from "next/server";
import { getNumberOneSongForDate } from "@/lib/billboard";
import { lookupYoutubeVideoForSong } from "@/lib/youtube";
import { searchSong } from "@/lib/spotify";

export async function GET(request: NextRequest) {
    const date = request.nextUrl.searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        return NextResponse.json({ message: "Missing or invalid date — expected YYYY-MM-DD." }, { status: 400 });
    }

    const numberOne = getNumberOneSongForDate(date);

    if (!numberOne) {
        return NextResponse.json({ message: "Could not find a song for that date." }, { status: 404 });
    }

    let songData;
    try {
        songData = await searchSong(numberOne.song, numberOne.artist);
    } catch (error) {
        console.error("Spotify search failed:", error);
        return NextResponse.json(
            { message: "Having trouble reaching Spotify right now — try again in a minute." },
            { status: 503 }
        );
    }
    const youtubeVideoInfo = lookupYoutubeVideoForSong(numberOne.song, numberOne.artist);

    if (!songData) {
        return NextResponse.json({ message: "Could not find song data from Spotify." }, { status: 404 });
    }

    return NextResponse.json({
        chartDate: numberOne.date,
        ...songData,
        videoId: youtubeVideoInfo?.videoId ?? null,
    });
}
