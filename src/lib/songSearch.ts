import spotifyOverrides from "../../data/spotify-overrides.json" with { type: "json" };

// Billboard's title and artist, cleaned up to search with: the site's own Spotify lookup and the share
// sheet's "Copy song name" both use this, so what people paste into Spotify, Instagram or TikTok matches
// what the site found

type SongOverride = { artist?: string; title?: string; trackId?: string; reason?: string };
export const overrides = spotifyOverrides as Record<string, SongOverride>;

export const searchTerms = (title: string, artist: string): { title: string; artist: string } => {
    const override = overrides[`${title}|${artist}`];
    return {
        // drops "(From ...)" and "(theme ...)" notes, and keeps the first side of a double A-side
        title: (override?.title ?? title)
            .replace(/\(\s*(from|theme)\b[^)]*\)/gi, "")
            .split("/")[0]
            .trim(),
        // keeps the lead artist only
        artist: (override?.artist ?? artist)
            .replace(/\(\s*(featuring|feat\.?)\b[^)]*\)/gi, "")
            .replace(/\s+(featuring|feat\.?|duet with|with|starring)\s+.*$/i, "")
            .trim(),
    };
};

// "Break Your Heart Taio Cruz": ready to paste into a music search
export const songSearchText = (title: string, artist: string): string => {
    const terms = searchTerms(title, artist);
    return `${terms.title} ${terms.artist}`;
};
