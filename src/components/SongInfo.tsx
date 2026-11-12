import { ReactElement } from "react";
import { display, roboto } from "@/lib/fonts";
import { formatLongDate } from "@/lib/dates";
import type { SongResult } from "@/components/BirthdayBeats";

type SongInfoProps = {
    songData: SongResult;
};

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
};

export default function SongInfo(props: SongInfoProps): ReactElement {
    const { songData } = props;
    const hasTrackNumber = songData.albumTotalTracks > 1;

    return (
        <div
            className={`${roboto.className} flex flex-col items-center gap-1.5 text-center lg:items-start lg:text-left`}
        >
            {/* the E badge sits inside the heading so it follows the last word, however the title wraps */}
            <h2 className={`${display.className} text-2xl font-extrabold leading-tight text-balance lg:text-3xl`}>
                {songData.title}
                {songData.explicit && (
                    <span
                        title="Explicit"
                        className={`${roboto.className} ml-2 inline-flex h-4 w-4 items-center justify-center rounded-xs bg-line align-middle text-[10px] font-bold text-foreground`}
                    >
                        E
                    </span>
                )}
            </h2>

            <p className="font-medium lg:text-lg">{songData.artistList.join(", ")}</p>

            {/* phones: one compact line. wide screens: a label list, since there's room beside the art */}
            <p className="text-sm text-muted lg:hidden">
                {songData.albumName} ·{" "}
                {hasTrackNumber && (
                    <>
                        Track {songData.trackNumber} of {songData.albumTotalTracks} ·{" "}
                    </>
                )}
                {songData.releaseDate.slice(0, 4)} · {formatDuration(songData.duration)}
            </p>

            <dl className="mt-3 hidden grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm lg:grid">
                <dt className="text-muted">Album</dt>
                <dd>{songData.albumName}</dd>
                {hasTrackNumber && (
                    <>
                        <dt className="text-muted">Track</dt>
                        <dd>
                            {songData.trackNumber} of {songData.albumTotalTracks}
                        </dd>
                    </>
                )}
                <dt className="text-muted">Year</dt>
                <dd>{songData.releaseDate.slice(0, 4)}</dd>
                <dt className="text-muted">Length</dt>
                <dd>{formatDuration(songData.duration)}</dd>
            </dl>

            <p className="text-xs text-muted lg:mt-3 lg:text-sm">#1 the week of {formatLongDate(songData.chartDate)}</p>
        </div>
    );
}
