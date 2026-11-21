"use client";
import { MouseEvent, ReactElement, useEffect, useRef, useState } from "react";
import { display, roboto } from "@/lib/fonts";
import { copyText } from "@/lib/copyText";
import {
    androidEscapeLink,
    friendShareText,
    instagramEscapeLink,
    shareImagePath,
    shareLink,
    sharedResultUrl,
    type ShareKind,
} from "@/lib/share";
import { shareScreen, type ShareScreen } from "@/lib/shareEnvironment";
import { songSearchText } from "@/lib/songSearch";

type ShareSheetProps = {
    week: string; // the chart week of the song on screen
    year: string; // the year printed on the image
    kind: ShareKind;
    title: string; // the song as the chart prints it, also on the image
    artist: string; // the chart's artist, for the text people paste into a music search
    onClose: () => void;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const buttonBase = `inline-flex w-full items-center justify-center rounded-2xl text-center font-medium leading-tight ${focusRing}`;
const mainLook = `${buttonBase} min-h-12 px-4 py-3 bg-brand-blue text-base text-white`;
const mainButton = `${mainLook} hover:cursor-pointer hover:bg-brand-blue/90`;
// Share picture before its picture has loaded: faded, with no hover, so it doesn't look ready
const waitingButton = `${mainLook} opacity-60`;
const plainButton = `${buttonBase} min-h-11 px-2 py-2 border border-line bg-surface text-sm hover:cursor-pointer hover:border-brand-blue`;
const doneButton = `${buttonBase} min-h-11 px-2 py-2 border border-brand-green bg-surface text-sm hover:cursor-pointer`;

const storyLine = "Post it to your Story, then add the song so it plays.";
const computerLine = "Save it, then post it from your phone. Add the song so it plays.";

// websites can't post into a Story or add its song, so this hands over the pieces: the picture to save or
// share, the link and the song name to copy. most people know the rest; "New to this?" covers the ones who don't
export default function ShareSheet({ week, year, kind, title, artist, onClose }: ShareSheetProps): ReactElement {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const linkRef = useRef<HTMLInputElement>(null);
    const songRef = useRef<HTMLInputElement>(null);
    // checked once, when the sheet opens (it only ever renders in the browser)
    const [screen] = useState<ShareScreen>(() =>
        shareScreen({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            maxTouchPoints: navigator.maxTouchPoints,
        }),
    );
    const imagePath = shareImagePath(week, year, kind);
    const link = shareLink(kind);
    // "Break Your Heart Taio Cruz": what Copy song name copies, ready to paste into Spotify, Instagram or TikTok
    const songText = songSearchText(title, artist);
    // where the escape links land: this result, with the sheet open, on the site this page came from
    const resultUrl = sharedResultUrl(week, year, kind, window.location.origin);
    const fileName = kind === "seventeen" ? "my-2027-song.png" : "my-birthday-song.png";
    const onIPhone = screen === "iphone-instagram" || screen === "iphone";
    // phones can hand the picture to the share menu. not from Instagram's Android browser, which has none, and
    // not from a computer, where saving the file is the useful thing. asked with an empty file, so the main
    // button is right from the start and doesn't jump when the real picture arrives
    const [canShareFiles, setCanShareFiles] = useState(
        () =>
            (onIPhone || screen === "android") &&
            navigator.canShare?.({ files: [new File([], fileName, { type: "image/png" })] }) === true,
    );
    const [canShareLink] = useState(() => typeof navigator.share === "function");
    const [file, setFile] = useState<File | null>(null);
    // a phone's clipboard holds one thing, so "Link copied" only shows while the link is that thing
    const [lastCopied, setLastCopied] = useState<"link" | "song" | null>(null);
    const [linkFailed, setLinkFailed] = useState(false);
    const [songFailed, setSongFailed] = useState(false);

    // the sheet takes focus itself, not the X: opened from a shared link, before any tap, the browser would
    // show the X's keyboard ring. Tab still goes to the X first
    useEffect(() => {
        dialogRef.current?.showModal();
        dialogRef.current?.focus();
    }, []);

    // fetched ahead of time: the share menu only opens when the tap calls it right away. if the picture
    // can't be had, the sheet falls back to saving it
    useEffect(() => {
        if (!canShareFiles) return;
        let cancelled = false;
        fetch(imagePath)
            .then((response) => (response.ok ? response.blob() : null))
            .then((blob) => {
                if (cancelled) return;
                const image = blob && new File([blob], fileName, { type: "image/png" });
                if (image && navigator.canShare?.({ files: [image] })) setFile(image);
                else setCanShareFiles(false);
            })
            .catch(() => {
                if (!cancelled) setCanShareFiles(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canShareFiles, imagePath, fileName]);

    const copyLink = async () => {
        if (!(await copyText(link, linkRef.current))) return setLinkFailed(true);
        setLinkFailed(false);
        setLastCopied("link");
    };

    const copySong = async (e: MouseEvent<HTMLButtonElement>) => {
        const tapped = e.currentTarget;
        const copied = await copyText(songText, songRef.current);
        // the fallback focuses the song's field, which stays out of sight, so focus goes back to the button
        if (document.activeElement === songRef.current) tapped.focus();
        if (!copied) return setSongFailed(true);
        setSongFailed(false);
        setLastCopied("song");
    };

    // the file goes alone: with text or a link along, the app may take those and skip the picture.
    // share() comes first, with nothing awaited before it, or Safari won't open the menu
    const sharePicture = async () => {
        if (!file) return; // still loading, a moment after the sheet opens
        try {
            await navigator.share({ files: [file] });
        } catch {
            // closed the menu, or the app said no
        }
    };

    // the link alone, so the chat shows the page's preview
    const sendToFriend = async () => {
        try {
            await navigator.share({ url: link, text: friendShareText(kind) });
        } catch {}
    };

    // A always gets this line; an iPhone browser that can't share the picture gets it too, since a download
    // lands in Files, where Instagram can't pick it from
    const holdToSave = screen === "iphone-instagram" || (onIPhone && !canShareFiles);

    const mainAction =
        screen === "android-instagram" ? (
            // C: Instagram's Android browser can't save or share, so the way out comes first
            <div className="flex w-full flex-col gap-1.5">
                <a href={androidEscapeLink(resultUrl)} className={mainButton}>
                    Open in your browser
                </a>
                <p className="text-xs text-muted">Instagram&apos;s browser here can&apos;t save pictures.</p>
            </div>
        ) : canShareFiles ? (
            // shows right away, waiting until the picture is in hand (a tap does nothing until then)
            <button
                type="button"
                onClick={sharePicture}
                aria-disabled={file ? undefined : true}
                className={file ? mainButton : waitingButton}
            >
                Share picture
            </button>
        ) : onIPhone ? null : (
            <a href={imagePath} download={fileName} className={mainButton}>
                Save picture
            </a>
        );

    const linkCopied = lastCopied === "link";
    const songCopied = lastCopied === "song";

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            // a tap on the dimmed backdrop lands on the dialog itself
            onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
            aria-labelledby="share-title"
            tabIndex={-1}
            className={`${roboto.className} m-auto max-h-[100dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-background p-0 text-foreground shadow-2xl outline-none backdrop:bg-black/70`}
        >
            {/* stays at the top while the sheet scrolls, so the X is always in reach */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background pt-3 pr-3 pb-2 pl-5">
                <h2 id="share-title" className={`${display.className} text-xl font-extrabold`}>
                    Share your song
                </h2>
                <button
                    type="button"
                    aria-label="Close"
                    onClick={() => dialogRef.current?.close()}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full hover:cursor-pointer hover:bg-line/60 ${focusRing}`}
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="size-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.25}
                        strokeLinecap="round"
                    >
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>
            </div>

            {/* the padding lives here, not on the dialog, so a tap inside the card never counts as a backdrop tap */}
            <div className="flex flex-col items-center gap-4 px-5 pb-5 text-center text-sm">
                <div className="flex flex-col items-center gap-2">
                    {/* a plain image, in no link and with nothing over it, so press and hold offers Save to Photos.
                        a set height keeps its space before it loads and leaves room for the buttons */}
                    <img
                        src={imagePath}
                        alt="Your song as a Story picture"
                        width={1080}
                        height={1920}
                        className="h-[min(40dvh,26rem)] w-auto max-w-full rounded-xl object-contain shadow-lg ring-1 ring-line"
                    />
                    {holdToSave && <p className="text-xs text-muted">Press and hold the picture to save it.</p>}
                </div>

                <p className="text-base font-medium text-balance">{screen === "computer" ? computerLine : storyLine}</p>

                {mainAction}

                <div className="relative w-full">
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={copyLink} className={linkCopied ? doneButton : plainButton}>
                            {linkCopied ? "Link copied" : "Copy link"}
                        </button>
                        <button type="button" onClick={copySong} className={songCopied ? doneButton : plainButton}>
                            {songCopied ? "Song name copied" : "Copy song name"}
                        </button>
                    </div>
                    {/* out of sight but there for the old copy command to select. the link's field shows when
                        copying the link fails. 16px text, or focusing it zooms the page on an iPhone */}
                    <input
                        ref={linkRef}
                        readOnly
                        value={link}
                        aria-label="Link to share"
                        tabIndex={linkFailed ? undefined : -1}
                        onFocus={(e) => e.currentTarget.select()}
                        className={
                            linkFailed
                                ? `mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-center text-base text-muted ${focusRing}`
                                : "sr-only text-base"
                        }
                    />
                    <input
                        ref={songRef}
                        readOnly
                        value={songText}
                        aria-label="Song name to search"
                        tabIndex={-1}
                        className="sr-only text-base"
                    />
                    {linkFailed && (
                        <p role="status" className="mt-2 font-medium">
                            Press and hold the link to copy it.
                        </p>
                    )}
                    {songFailed && (
                        <p role="status" className="mt-2 font-medium">
                            Copy didn&apos;t work. Type {`"${songText}"`} instead.
                        </p>
                    )}
                </div>

                {canShareLink && (
                    <button type="button" onClick={sendToFriend} className={plainButton}>
                        Send to a friend
                    </button>
                )}

                {screen === "iphone-instagram" && (
                    <a
                        href={instagramEscapeLink(resultUrl)}
                        className={`inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-brand-blue underline ${focusRing}`}
                    >
                        Can&apos;t save? Open in your browser
                    </a>
                )}

                <details className="w-full text-left">
                    <summary className={`min-h-11 cursor-pointer rounded-lg py-3 font-semibold ${focusRing}`}>
                        New to this?
                    </summary>
                    <ol className="flex list-decimal flex-col gap-1.5 pt-1 pl-6">
                        <li>Save the picture.</li>
                        <li>In Instagram or TikTok, start a Story and pick the picture.</li>
                        <li>
                            Add music and search {`"${songText}"`}. On Instagram, add a Link sticker and paste the link.
                        </li>
                    </ol>
                </details>
            </div>
        </dialog>
    );
}
