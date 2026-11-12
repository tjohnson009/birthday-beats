import type { Song } from "@/lib/spotify";

// how a song's Spotify details were found, or why they weren't
export type SpotifyStatus =
    | "cached" // saved from an earlier lookup
    | "fresh" // just looked up on Spotify
    | "not-cached" // a strip peek: not saved yet, and peeks never call Spotify
    | "limited" // a visitor or site-wide Spotify limit was reached
    | "not-found" // Spotify has no match for this song
    | "unavailable"; // Spotify errored

// what /api/song returns. title and artist come from the Billboard chart, so the song can be shown
// even when spotify is null
export type SongResult = {
    chartDate: string;
    title: string;
    artist: string;
    videoId: string | null;
    spotify: Song | null;
    spotifyStatus: SpotifyStatus;
};
