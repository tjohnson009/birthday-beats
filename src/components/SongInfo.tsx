import { ReactElement } from "react";
import { Roboto } from "next/font/google";
import type { SongResult } from "@/app/page";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

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

    return (
        <div className={`${roboto.className} flex flex-col gap-1`}>
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium leading-snug">{songData.title}</h2>
                {songData.explicit && (
                    <span
                        title="Explicit"
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-neutral-300 text-[10px] font-bold text-black dark:bg-neutral-600 dark:text-white"
                    >
                        E
                    </span>
                )}
            </div>

            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {songData.artistList.join(", ")}
            </p>

            <p className="text-sm text-neutral-500">
                {songData.albumName} ·{" "}
                {songData.albumTotalTracks > 1 && (
                    <>
                        Track {songData.trackNumber} of {songData.albumTotalTracks} ·{" "}
                    </>
                )}
                {songData.releaseDate.slice(0, 4)} · {formatDuration(songData.duration)}
            </p>

            <p className="text-xs text-neutral-500">#1 the week of {songData.chartDate}</p>
        </div>
    );
}