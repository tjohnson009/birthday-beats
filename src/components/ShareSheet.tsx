"use client";
import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { display, roboto } from "@/lib/fonts";
import { copyText } from "@/lib/copyText";
import {
    addYoursPrompt,
    androidEscapeLink,
    friendShareText,
    instagramEscapeLink,
    shareImagePath,
    shareLink,
    sharedResultUrl,
    type ShareKind,
} from "@/lib/share";
import { shareScreen, type ShareScreen } from "@/lib/shareEnvironment";

type ShareSheetProps = {
    week: string; // the chart week of the song on screen
    year: string; // the year printed on the image
    kind: ShareKind;
    title: string; // the song and artist as the chart prints them, also on the image
    artist: string;
    spotifyId: string | null;
    onClose: () => void;
};

const buttonClass =
    "inline-block rounded-2xl px-4 py-2.5 text-center text-sm font-medium hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const mainButton = `${buttonClass} bg-brand-blue text-white hover:bg-brand-blue/90`;
const plainButton = `${buttonClass} border border-line bg-surface hover:border-brand-blue`;
const doneButton = `${buttonClass} border border-brand-green bg-surface`;
const smallButton =
    "rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:cursor-pointer hover:border-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const summaryClass = "cursor-pointer py-1 font-semibold";

function Step({ heading, children }: { heading: string; children: ReactNode }): ReactElement {
    return (
        <section className="flex w-full flex-col gap-2 text-left">
            <h3 className={`${display.className} text-base font-extrabold`}>{heading}</h3>
            {children}
        </section>
    );
}

// what to tap inside Instagram, the same on every screen. the song goes first because it is the trend,
// then the link, so the pasted link is still the thing on the clipboard
function InstagramSteps({
    opening,
    title,
    artist,
    kind,
    songButton,
    linkAgain,
}: {
    opening: string;
    title: string;
    artist: string;
    kind: ShareKind;
    songButton?: ReactNode;
    linkAgain?: ReactNode;
}): ReactElement {
    return (
        <div className="flex flex-col gap-2">
            <p>{opening}</p>
            <ul className="flex flex-col gap-2 pl-1">
                <li>
                    <b>Add the picture:</b> Tap + and pick Story (or swipe right from your feed). Tap the picture you
                    just saved.
                </li>
                <li>
                    <b>Add the song so it plays:</b> Tap the music note on the right side. No music note? Tap the
                    sticker button (the square smiley), then Music. Search <b>{title}</b>, tap it, then tap Done.
                    <span className="block text-muted">by {artist}</span>
                    {songButton && (
                        <span className="mt-1 flex flex-col items-start gap-1">
                            {songButton}
                            <span className="text-xs text-muted">
                                This replaces the copied link. Come back here and copy the link again before the Link
                                step.
                            </span>
                            {linkAgain}
                        </span>
                    )}
                </li>
                <li>
                    <b>Add the link:</b> Tap the sticker button, then Link. (Can&apos;t find it? Type link in the search
                    box.) Press and hold in the box, tap Paste, then tap Done. Drag the sticker onto the box at the
                    bottom of your picture.
                </li>
                <li>
                    <b>Post:</b> Tap Your story.
                </li>
            </ul>
            <p>
                <b>Bonus: get friends to post theirs.</b> Before you post, tap the sticker button, then Add Yours. Type:{" "}
                {addYoursPrompt(kind)}. Then tap Nominate a friend.
            </p>
        </div>
    );
}

// websites can't post into an Instagram Story or add its song, so this hands over the pieces (the picture to
// save, the link to paste into a Link sticker) and says what to tap. most people land here inside Instagram's
// own browser, which can't do what Safari or Chrome can, so each place gets its own screen
export default function ShareSheet({
    week,
    year,
    kind,
    title,
    artist,
    spotifyId,
    onClose,
}: ShareSheetProps): ReactElement {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const linkRef = useRef<HTMLInputElement>(null);
    // checked once, when the sheet opens (it only ever renders in the browser)
    const [screen] = useState<ShareScreen>(() =>
        shareScreen({
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            maxTouchPoints: navigator.maxTouchPoints,
        }),
    );
    const [canShareLink] = useState(() => typeof navigator.share === "function");
    const [file, setFile] = useState<File | null>(null);
    // a phone's clipboard holds one thing, so "Link copied" only shows while the link is that thing
    const [lastCopied, setLastCopied] = useState<"link" | "song" | null>(null);
    const [linkFailed, setLinkFailed] = useState(false);
    const [songFailed, setSongFailed] = useState(false);
    const [remind, setRemind] = useState(false);
    // set the first time they come back to a wiped link: from then on step 3 keeps its own copy button
    const [cameBack, setCameBack] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const imagePath = shareImagePath(week, year, kind);
    const link = shareLink(kind);
    // where the escape links land: this result, with the sheet open, on the site this page came from
    const resultUrl = sharedResultUrl(week, year, kind, window.location.origin);
    const fileName = kind === "seventeen" ? "my-2027-song.png" : "my-birthday-song.png";
    const onIPhone = screen === "iphone-instagram" || screen === "iphone";
    const inInstagram = screen === "iphone-instagram" || screen === "android-instagram";
    const realBrowser = screen === "iphone" || screen === "android";

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    // fetched ahead of time: the share menu only opens when the tap calls it right away. only Safari and
    // Chrome on phones get Send to Instagram; Instagram's browser has no share menu
    useEffect(() => {
        if (!realBrowser || !navigator.canShare) return;
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
    }, [realBrowser, imagePath, fileName]);

    // copying the song name wiped the link. when they come back from Instagram, ask for the link again
    useEffect(() => {
        if (lastCopied !== "song") return;
        const onReturn = () => {
            if (document.visibilityState !== "visible") return;
            setRemind(true);
            setCameBack(true);
        };
        document.addEventListener("visibilitychange", onReturn);
        return () => document.removeEventListener("visibilitychange", onReturn);
    }, [lastCopied]);

    const copyLink = async () => {
        if (!(await copyText(link, linkRef.current))) return setLinkFailed(true);
        setLinkFailed(false);
        setRemind(false);
        setLastCopied("link");
    };

    const copySong = async () => {
        if (!(await copyText(title, null))) return setSongFailed(true);
        setSongFailed(false);
        setLastCopied("song");
    };

    // the file goes alone: with text or a link along, the app may take those and skip the picture.
    // share() comes first, with nothing awaited before it, or Safari won't open the menu
    const sendToInstagram = async () => {
        try {
            await navigator.share({ files: [file!] });
        } catch {
            // closed the menu, or the app said no: the steps still work
        }
    };

    // the link alone, so the chat shows the page's preview
    const sendToFriend = async () => {
        try {
            await navigator.share({ url: link, text: friendShareText(kind) });
        } catch {}
    };

    const picture = (
        <img
            src={imagePath}
            alt="Your song as a Story picture"
            width={1080}
            height={1920}
            className="h-auto max-h-[45dvh] w-auto rounded-xl shadow-lg"
        />
    );

    const linkCopied = lastCopied === "link";
    const copyLinkButton = (
        <button type="button" onClick={copyLink} className={linkCopied ? doneButton : mainButton}>
            {linkCopied ? "Link copied" : remind ? "Copy link again" : "Copy link"}
        </button>
    );
    const linkGoneLine = "Your link isn't copied anymore. Copy it for the Link sticker.";

    const copyLinkBlock = (
        <div className="flex flex-col gap-2">
            {copyLinkButton}
            {remind && !linkCopied && (
                <p role="status" className="font-medium">
                    {linkGoneLine}
                </p>
            )}
            <input
                ref={linkRef}
                readOnly
                value={link}
                aria-label="Link to share"
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-center text-sm text-muted"
            />
            {linkFailed && (
                <p role="status" className="font-medium">
                    Press and hold the link, then tap Copy.
                </p>
            )}
        </div>
    );

    const songButton = (
        <span className="inline-flex flex-col items-start gap-1">
            <button type="button" onClick={copySong} className={smallButton}>
                {lastCopied === "song" ? "Song name copied" : "Copy song name"}
            </button>
            {songFailed && <span className="text-xs text-muted">Copy didn&apos;t work here. Type it instead.</span>}
        </span>
    );

    // coming back from Instagram puts them at the song step, far below step 1, so the reminder shows here too.
    // it stays once the link is copied, so the tap gets its "Link copied" where it happened
    const linkAgain = (remind || (cameBack && linkCopied)) && (
        <span className="mt-2 flex flex-col items-start gap-1">
            {copyLinkButton}
            {/* no role="status": step 1's copy of this line already announces it */}
            {remind && !linkCopied && <span className="font-medium">{linkGoneLine}</span>}
        </span>
    );

    const iphoneEscape = (
        <a href={instagramEscapeLink(resultUrl)} className={plainButton}>
            Open in your browser
        </a>
    );

    const fullScreenButton = (
        <div className="flex flex-col items-start gap-1">
            <button type="button" onClick={() => setFullScreen(true)} className={plainButton}>
                Full screen
            </button>
            <p className="text-xs text-muted">
                {onIPhone
                    ? "Take a screenshot (press the side and volume up buttons together, or the side and Home buttons). Tap to close."
                    : "Take a screenshot (hold the power and volume down buttons). Tap to close."}
            </p>
        </div>
    );

    const steps = (opening: string, withSongButton = false) => (
        <InstagramSteps
            opening={opening}
            title={title}
            artist={artist}
            kind={kind}
            songButton={withSongButton ? songButton : undefined}
            linkAgain={withSongButton ? linkAgain : undefined}
        />
    );

    const havingTrouble = (
        <details className="w-full text-left">
            <summary className={summaryClass}>Having trouble?</summary>
            <div className="flex flex-col gap-4 pt-2">
                {spotifyId && (
                    <div className="flex flex-col items-start gap-2">
                        <p>
                            <b>No music note, or the song isn&apos;t there?</b> Some business accounts and some
                            countries get fewer songs. Tap Open in Spotify, then Share, then Stories. Spotify adds the
                            song and it plays. Then add your picture: sticker button, then Photo. Then add the link.
                        </p>
                        <a
                            href={`https://open.spotify.com/track/${spotifyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={plainButton}
                        >
                            Open in Spotify
                        </a>
                        {inInstagram && (
                            <>
                                <p>
                                    If Spotify&apos;s website opens instead of the app, open the Spotify app and search
                                    the song.
                                </p>
                                {songButton}
                            </>
                        )}
                    </div>
                )}
                <div className="flex flex-col items-start gap-2">
                    <p>
                        <b>Can&apos;t save the picture?</b> Tap Full screen and take a screenshot.
                    </p>
                    {fullScreenButton}
                </div>
                {screen === "iphone-instagram" && (
                    <p>
                        <b>Still stuck?</b> Tap{" "}
                        <a href={instagramEscapeLink(resultUrl)} className="font-medium text-brand-blue underline">
                            Open in your browser
                        </a>
                        .
                    </p>
                )}
            </div>
        </details>
    );

    const moreWays = (
        <section className="flex w-full flex-col items-start gap-2 text-left">
            <h3 className="font-semibold">More ways to share</h3>
            {canShareLink && (
                <button type="button" onClick={sendToFriend} className={plainButton}>
                    Send to a friend
                </button>
            )}
            <p>
                <b>TikTok:</b> Tap +, then Upload. Pick the picture, tap Add sound, and search {title}.
            </p>
            {songButton}
        </section>
    );

    const trendLine = "In Instagram, add the song so it plays. That's the whole trend.";

    const body: Record<ShareScreen, ReactNode> = {
        // A: stay in Instagram. press and hold saves, and leaving is the backup
        "iphone-instagram": (
            <>
                <Step heading="1. Copy the link">{copyLinkBlock}</Step>
                <Step heading="2. Save the picture">
                    <p>Press and hold the picture, then tap Save to Photos.</p>
                    <p>No Save to Photos?</p>
                    {iphoneEscape}
                    <p className="text-xs text-muted">
                        If Instagram asks, say yes. Nothing happened? Tap the three dots at the top, then pick the
                        option that opens your browser.
                    </p>
                </Step>
                {/* no Copy song name here: once this page closes, they can't come back to copy the link again */}
                <Step heading="3. In Instagram">{steps("Close this page (tap X at the top). Then:")}</Step>
            </>
        ),
        // B: Safari, or another iPhone browser
        iphone: (
            <>
                <Step heading="1. Copy the link">{copyLinkBlock}</Step>
                <Step heading="2. Save the picture">
                    <p>Press and hold the picture, then tap Save to Photos.</p>
                    {file && (
                        <>
                            <button type="button" onClick={sendToInstagram} className={plainButton}>
                                Send to Instagram
                            </button>
                            <p className="text-xs text-muted">
                                Pick Instagram, then Story. Your picture opens in Instagram, so skip Add the picture.
                            </p>
                        </>
                    )}
                </Step>
                <Step heading="3. In Instagram">{steps("Open Instagram. Then:", true)}</Step>
            </>
        ),
        // C: Instagram's Android browser can't save or share, so this screen is about leaving
        "android-instagram": (
            <>
                <div className="flex w-full flex-col gap-2 text-left">
                    <a href={androidEscapeLink(resultUrl)} className={mainButton}>
                        Open in your browser
                    </a>
                    <p className="text-xs text-muted">
                        Nothing happened? Tap the three dots at the top, then Open in Chrome (or your browser&apos;s
                        name).
                    </p>
                </div>
                <details className="w-full text-left">
                    <summary className={summaryClass}>Can&apos;t leave Instagram?</summary>
                    <div className="flex flex-col gap-4 pt-2">
                        {fullScreenButton}
                        {copyLinkBlock}
                        {steps("Close this page (tap X at the top). Then:")}
                    </div>
                </details>
            </>
        ),
        // D: Chrome or Samsung Internet
        android: (
            <>
                <Step heading="1. Copy the link">{copyLinkBlock}</Step>
                <Step heading="2. Save the picture">
                    <a href={imagePath} download={fileName} className={mainButton}>
                        Save picture
                    </a>
                    <p className="text-xs text-muted">
                        It saves to your Downloads. Or press and hold the picture, then tap Download image.
                    </p>
                    {file && (
                        <>
                            <button type="button" onClick={sendToInstagram} className={plainButton}>
                                Send to Instagram
                            </button>
                            <p className="text-xs text-muted">
                                Pick Instagram, then Stories. Your picture opens in Instagram, so skip Add the picture.
                            </p>
                        </>
                    )}
                </Step>
                <Step heading="3. In Instagram">{steps("Open Instagram. Then:", true)}</Step>
            </>
        ),
        // E: a computer. Stories get posted from the phone
        computer: (
            <>
                <div className="flex w-full flex-col gap-2">
                    <a href={imagePath} download={fileName} className={plainButton}>
                        Download picture
                    </a>
                    {copyLinkBlock}
                </div>
                <details className="w-full text-left">
                    <summary className={summaryClass}>What to do in Instagram</summary>
                    <div className="pt-2">{steps("On your phone, open Instagram. Then:")}</div>
                </details>
            </>
        ),
    };

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            // Escape closes the full screen picture first
            onCancel={(e) => {
                if (!fullScreen) return;
                e.preventDefault();
                setFullScreen(false);
            }}
            // a tap on the dimmed backdrop lands on the dialog itself
            onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
            aria-labelledby="share-title"
            className={`${roboto.className} m-auto max-h-[100dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/70`}
        >
            {/* the padding lives here, not on the dialog, so a tap inside the card never counts as a backdrop tap */}
            <div className="flex flex-col items-center gap-5 p-5 text-center text-sm">
                <div className="flex flex-col gap-1">
                    <h2 id="share-title" className={`${display.className} text-xl font-extrabold`}>
                        Share to your Story
                    </h2>
                    <p className="text-base font-medium text-balance">
                        {screen === "android-instagram"
                            ? "Instagram's browser can't save pictures. Open this page in your browser to get yours."
                            : screen === "computer"
                              ? `Stories are posted from the Instagram app on your phone. ${trendLine}`
                              : trendLine}
                    </p>
                </div>
                {/* a plain image, in no link and with nothing over it, so press and hold offers Save to Photos */}
                {picture}

                {body[screen]}

                {screen !== "computer" && havingTrouble}
                {moreWays}

                <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className={`${buttonClass} text-muted hover:text-foreground`}
                >
                    Close
                </button>
            </div>

            {/* the picture alone on black, for a screenshot when saving doesn't work */}
            {fullScreen && (
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Close full screen"
                    // focused without scrolling: autoFocus scrolls it into view, which jolts the screen
                    ref={(overlay) => overlay?.focus({ preventScroll: true })}
                    onClick={() => setFullScreen(false)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFullScreen(false)}
                    className="fixed inset-0 z-10 flex items-center justify-center bg-black"
                >
                    <img
                        src={imagePath}
                        alt="Your song as a Story picture"
                        width={1080}
                        height={1920}
                        className="h-full w-full object-contain"
                    />
                </div>
            )}
        </dialog>
    );
}
