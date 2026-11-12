import { NextRequest, NextResponse } from "next/server";
import { getNumberOneSongForDate } from "@/lib/billboard";
import { lookupYoutubeVideoForSong } from "@/lib/youtube";
import { getSongDetails } from "@/lib/songCache";
import { logSearch } from "@/lib/events";
import type { SongResult } from "@/lib/songResult";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const date = params.get("date");
    // mode=peek only reads the cache (the strip uses it on every stop); source=strip keeps strip stops out of the stats
    const peek = params.get("mode") === "peek";
    const fromStrip = params.get("source") === "strip";
    const visitor =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        return NextResponse.json({ message: "Missing or invalid date — expected YYYY-MM-DD." }, { status: 400 });
    }

    const logAttempt = async (found: boolean) => {
        if (fromStrip) return;
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

    // when Spotify can't help (a limit, an error, no match) the song still comes back, without spotify details
    const { song, status } = await getSongDetails(numberOne.song, numberOne.artist, { peek, visitor });
    const youtubeVideoInfo = lookupYoutubeVideoForSong(numberOne.song, numberOne.artist);

    await logAttempt(true);
    return NextResponse.json({
        chartDate: numberOne.date,
        title: numberOne.song,
        artist: numberOne.artist,
        videoId: youtubeVideoInfo?.videoId ?? null,
        spotify: song,
        spotifyStatus: status,
    } satisfies SongResult);
}
