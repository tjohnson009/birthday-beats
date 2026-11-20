"use client";
import { ReactElement, useEffect, useRef, useState } from "react";
import { display, roboto } from "@/lib/fonts";
import { copyText } from "@/lib/copyText";
import { shareImagePath, shareLink, type ShareKind } from "@/lib/share";

type ShareSheetProps = {
    week: string; // the chart week of the song on screen
    year: string; // the year printed on the image
    kind: ShareKind;
    onClose: () => void;
};

const buttonClass =
    "rounded-2xl px-4 py-2.5 text-sm font-medium hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

// websites can't post into an Instagram Story, so this hands over the pieces: the image to save, the link to
// paste into a Link sticker, and the steps. it has to work in Instagram's built-in browser, where the share
// menu and the clipboard may be missing, so pressing and holding the image always works as a fallback
export default function ShareSheet({ week, year, kind, onClose }: ShareSheetProps): ReactElement {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const linkRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [copy, setCopy] = useState<"idle" | "copied" | "by-hand">("idle");
    const imagePath = shareImagePath(week, year, kind);
    const link = shareLink(kind);
    const fileName = kind === "seventeen" ? "my-2027-song.png" : "my-birthday-song.png";

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    // fetched ahead of time: Safari only opens the share menu when the tap calls it right away. skipped where
    // there's no share menu (Instagram's browser), since the <img> already downloads the image
    useEffect(() => {
        if (!navigator.canShare) return;
        let cancelled = false;
        fetch(imagePath)
            .then((response) => (response.ok ? response.blob() : null))
            .then((blob) => {
                if (!blob || cancelled) return;
                const image = new File([blob], fileName, { type: "image/png" });
                if (navigator.canShare?.({ files: [image] })) setFile(image);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [imagePath, fileName]);

    const copyLink = async () => {
        if (!(await copyText(link, linkRef.current))) return setCopy("by-hand");
        setCopy("copied");
        setTimeout(() => setCopy("idle"), 2000);
    };

    const share = async () => {
        try {
            await navigator.share({ files: [file!] });
        } catch {
            // closed the menu, or the app said no: the steps still work
        }
    };

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            // a tap on the dimmed backdrop lands on the dialog itself
            onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
            aria-labelledby="share-title"
            className={`${roboto.className} m-auto max-h-[100dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70`}
        >
            {/* the padding lives here, not on the dialog, so a tap inside the card never counts as a backdrop tap */}
            <div className="flex flex-col items-center gap-4 p-5 text-center">
                <h2 id="share-title" className={`${display.className} text-xl font-extrabold`}>
                    Share to your Story
                </h2>
                <img
                    src={imagePath}
                    alt="Your song as a story image"
                    width={1080}
                    height={1920}
                    className="h-auto max-h-[45dvh] w-auto rounded-xl shadow-lg"
                />
                <p className="text-xs text-muted">Press and hold to save, or take a screenshot</p>

                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={copyLink}
                        className={`${buttonClass} bg-brand-blue text-white hover:bg-brand-blue/90`}
                    >
                        {copy === "copied" ? "Copied!" : "Copy link"}
                    </button>
                    {file && (
                        <button
                            type="button"
                            onClick={share}
                            className={`${buttonClass} border border-line bg-surface hover:border-brand-blue`}
                        >
                            Share...
                        </button>
                    )}
                    <a
                        href={imagePath}
                        download={fileName}
                        className={`${buttonClass} hidden border border-line bg-surface hover:border-brand-blue sm:inline-block`}
                    >
                        Save image
                    </a>
                </div>
                <input
                    ref={linkRef}
                    readOnly
                    value={link}
                    aria-label="Link to share"
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-center text-sm text-muted"
                />
                {copy === "by-hand" && (
                    <p role="status" className="-mt-2 text-sm font-medium">
                        Press and hold the link above to copy it.
                    </p>
                )}

                <ol className="w-full list-decimal space-y-1 pl-5 text-left text-sm">
                    <li>Add this image to your Story.</li>
                    <li>Add a Link sticker and paste the link.</li>
                    <li>
                        Change the sticker text to &quot;
                        {kind === "seventeen" ? "Find YOUR 2027 song" : "Find your birthday song"}&quot;.
                    </li>
                </ol>

                <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className={`${buttonClass} text-muted hover:text-foreground`}
                >
                    Close
                </button>
            </div>
        </dialog>
    );
}
