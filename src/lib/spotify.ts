const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

export type Song = {
    id: string;
    title: string;
    albumArt: string | null;
    artistList: string[];
    explicit: boolean;
    releaseDate: string;
    albumName: string;
    albumType: string;
    albumTotalTracks: number;
    trackNumber: number;
    duration: number;
    spotifyUrl: string;
};

let token: { value: string; expiresAt: number } | null = null;

if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
}

export const getAccessToken = async () => {
    // check for fresh token
    if (token && Date.now() < token.expiresAt - 60000) {
        return token.value;
    }

    // call spotify API with proper credentials
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "client_credentials",
        }),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify token request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();

    token = {
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return token.value;
};

const ARTIST_ALIASES: Record<string, string> = {
    "Careless Whisper|Wham! Featuring George Michael": "George Michael", 
    "My Universe|Coldplay x BTS": "Coldplay", 
};

export const searchSong = async (title: string, artist: string): Promise<Song | null> => {
    const accessToken = await getAccessToken();
    const aliasedArtist = ARTIST_ALIASES[`${title}|${artist}`] ?? artist;
    const normalizedTitle = title.replace(/\(\s*(from|theme)\b[^)]*\)/gi, "").split("/")[0].trim();
    const leadArtist = aliasedArtist
        .replace(/\(\s*(featuring|feat\.?)\b[^)]*\)/gi, "")
        .replace(/\s+(featuring|feat\.?|duet with|with|starring)\s+.*$/i, "")
        .trim();
    const query = `track:${normalizedTitle} artist:${leadArtist}`;
    // if (year) query += ` year:${year}`;

    const params = new URLSearchParams({
        q: query,
        type: `track`,
        market: `US`,
        limit: `1`,
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    let track = data.tracks.items[0];

    if (!track) {
        const fallbackParams = new URLSearchParams({
            q: `${normalizedTitle} ${artist}`,
            type: `track`,
            market: `US`,
            limit: `1`,
        });

        const fallbackResponse = await fetch(`https://api.spotify.com/v1/search?${fallbackParams}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            track = fallbackData.tracks.items[0];
        }
    }

    if (!track) return null;

    return {
        id: track.id,
        title: track.name,
        artistList: track.artists.map((artist: { name: string }) => artist.name),
        explicit: track.explicit,
        releaseDate: track.album.release_date,
        albumName: track.album.name,
        albumArt: track.album.images[0]?.url ?? null,
        albumType: track.album.album_type,
        albumTotalTracks: track.album.total_tracks,
        trackNumber: track.track_number,
        duration: track.duration_ms,
        spotifyUrl: track.external_urls.spotify,
    };
};
