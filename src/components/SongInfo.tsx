import { ReactElement } from "react";
import { display, roboto } from "@/lib/fonts";
import type { SongResult, SpotifyStatus } from "@/lib/songResult";

type SongInfoProps = {
    songData: SongResult;
};

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
};

// shown in place of the album details when Spotify couldn't supply them
const missingDetails: Partial<Record<SpotifyStatus, string>> = {
    limited: "Album details are taking a short break. Check back in a few minutes.",
    "not-found": "Spotify doesn't have album details for this one.",
    unavailable: "Couldn't reach Spotify for album details right now.",
};

export default function SongInfo(props: SongInfoProps): ReactElement {
    const { songData } = props;
    const { spotify } = songData;
    // a strip stop on an unsaved song: Spotify details are on their way
    const waiting = !spotify && songData.spotifyStatus === "not-cached";

    return (
        <div
            className={`${roboto.className} flex flex-col items-center gap-1.5 text-center lg:items-start lg:text-left`}
        >
            {/* the E badge sits inside the heading so it follows the last word, however the title wraps */}
            <h2 className={`${display.className} text-2xl font-extrabold leading-tight text-balance lg:text-3xl`}>
                {spotify?.title ?? songData.title}
                {spotify?.explicit && (
                    <span
                        title="Explicit"
                        className={`${roboto.className} ml-2 inline-flex h-4 w-4 items-center justify-center rounded-xs bg-line align-middle text-[10px] font-bold text-foreground`}
                    >
                        E
                    </span>
                )}
            </h2>

            <p className="font-medium lg:text-lg">{spotify ? spotify.artistList.join(", ") : songData.artist}</p>

            {spotify && (
                <>
                    {/* phones: one compact line. wide screens: a label list, since there's room beside the art */}
                    <p className="text-sm text-muted lg:hidden">
                        {spotify.albumName} ·{" "}
                        {spotify.albumTotalTracks > 1 && (
                            <>
                                Track {spotify.trackNumber} of {spotify.albumTotalTracks} ·{" "}
                            </>
                        )}
                        {spotify.releaseDate.slice(0, 4)} · {formatDuration(spotify.duration)}
                    </p>

                    <dl className="mt-3 hidden grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm lg:grid">
                        <dt className="text-muted">Album</dt>
                        <dd>{spotify.albumName}</dd>
                        {spotify.albumTotalTracks > 1 && (
                            <>
                                <dt className="text-muted">Track</dt>
                                <dd>
                                    {spotify.trackNumber} of {spotify.albumTotalTracks}
                                </dd>
                            </>
                        )}
                        <dt className="text-muted">Year</dt>
                        <dd>{spotify.releaseDate.slice(0, 4)}</dd>
                        <dt className="text-muted">Length</dt>
                        <dd>{formatDuration(spotify.duration)}</dd>
                    </dl>
                </>
            )}

            {waiting && (
                <div aria-hidden="true" className="flex flex-col items-center gap-1.5 lg:mt-3 lg:items-start">
                    <span className="h-4 w-56 rounded bg-line/70 animate-pulse motion-reduce:animate-none" />
                    <span className="hidden h-4 w-32 rounded bg-line/70 animate-pulse motion-reduce:animate-none lg:block" />
                </div>
            )}

            {!spotify && !waiting && <p className="text-sm text-muted">{missingDetails[songData.spotifyStatus]}</p>}
        </div>
    );
}
