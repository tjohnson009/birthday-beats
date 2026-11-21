/**
 * @jest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import ShareSheet from "@/components/ShareSheet";
import { songSearchText } from "@/lib/songSearch";

// the share sheet's rules: the same short sheet on every screen, with the main button picked by where the
// person is, the one-thing clipboard, and what each share sends. phones are faked by their user agent

const LINK = "https://birthday-beats.vercel.app/17";
const TITLE = "Lady Marmalade";
const ARTIST = "Christina Aguilera, Lil' Kim, Mya & P!nk";
// what Copy song name copies and the help says to search: title and lead artist, cleaned up like the Spotify search
const SEARCH = songSearchText(TITLE, ARTIST);
const STORY_LINE = "Post it to your Story, then add the song so it plays.";
const COMPUTER_LINE = "Save it, then post it from your phone. Add the song so it plays.";
const HOLD_LINE = "Press and hold the picture to save it.";

// share: navigator.share exists. files: it can also share a picture file
type Phone = { userAgent: string; platform: string; maxTouchPoints: number; share: boolean; files: boolean };

const PHONES: Record<"A" | "B" | "C" | "D" | "E", Phone> = {
    // A: iPhone, inside Instagram
    A: {
        userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 356.0.0.32.111 (iPhone15,3; iOS 18_1; en_US; en; scale=3.00; 1290x2796; 654891233)",
        platform: "iPhone",
        maxTouchPoints: 5,
        share: true,
        files: true,
    },
    // B: iPhone, Safari
    B: {
        userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
        share: true,
        files: true,
    },
    // C: Android, inside Instagram, which has no share menu
    C: {
        userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 343.0.0.38.94 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 630156200)",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
        share: false,
        files: false,
    },
    // D: Android, Chrome
    D: {
        userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
        share: true,
        files: true,
    },
    // E: a computer
    E: {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
        share: true,
        files: true,
    },
};

const setNavigator = (name: string, value: unknown) =>
    Object.defineProperty(navigator, name, { value, configurable: true });

let share: jest.Mock;
let writeText: jest.Mock;
let onClose: jest.Mock;

// waits for the picture fetch too, so its update lands inside the test
const openSheet = async (phone: Phone, song = { title: TITLE, artist: ARTIST }) => {
    setNavigator("userAgent", phone.userAgent);
    setNavigator("platform", phone.platform);
    setNavigator("maxTouchPoints", phone.maxTouchPoints);
    share = jest.fn(async () => {});
    setNavigator("share", phone.share ? share : undefined);
    setNavigator("canShare", phone.share ? (data: ShareData) => !data.files || phone.files : undefined);
    writeText = jest.fn(async () => {});
    setNavigator("clipboard", { writeText });
    onClose = jest.fn();
    render(
        <ShareSheet
            week="2001-06-09"
            year="2001"
            kind="seventeen"
            title={song.title}
            artist={song.artist}
            onClose={onClose}
        />,
    );
    await act(async () => {});
};

const button = (name: string) => screen.getByRole("button", { name });
const noButton = (name: string) => screen.queryByRole("button", { name });
const link = (name: string) => screen.getByRole("link", { name });
const hasText = (text: string) => (document.body.textContent ?? "").includes(text);

beforeAll(() => {
    // jsdom has no modal dialogs
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
    };
});

beforeEach(() => {
    // the story picture, fetched ahead of the tap for Share picture
    global.fetch = jest.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["png"], { type: "image/png" }),
    })) as unknown as typeof fetch;
});

afterEach(cleanup);

describe("ShareSheet, the same short sheet everywhere", () => {
    it.each(["A", "B", "C", "D", "E"] as const)("%s: title and an X at the top that closes it", async (key) => {
        await openSheet(PHONES[key]);

        const header = screen.getByRole("heading", { name: "Share your song" }).parentElement!;
        const close = within(header).getByRole("button", { name: "Close" });
        // one way to close, and it's the X
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
        expect(header.className).toMatch(/\bsticky\b/);
        expect(header.className).toMatch(/\btop-0\b/);
        expect(close.className).toMatch(/\bsize-11\b/);
        expect(close.className).toMatch(/focus-visible:outline/);

        fireEvent.click(close);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // focus on the X would show its ring the moment a shared link opens the sheet
    it.each(["A", "C", "E"] as const)("%s: opens with focus on the sheet itself, not the X", async (key) => {
        await openSheet(PHONES[key]);

        const dialog = screen.getByRole("dialog", { name: "Share your song" });
        expect(document.activeElement).toBe(dialog);
        expect(dialog.className).toMatch(/\boutline-none\b/);
    });

    it.each(["A", "B", "C", "D", "E"] as const)("%s: the picture is a plain image in no link", async (key) => {
        await openSheet(PHONES[key]);

        const picture = screen.getByRole("img", { name: "Your song as a Story picture" });
        expect(picture.getAttribute("src")).toBe("/api/share-image?week=2001-06-09&year=2001&kind=seventeen");
        expect(picture.closest("a")).toBeNull();
        // a thin edge, so a dark picture doesn't melt into the dark sheet
        expect(picture.className).toMatch(/\bring-1\b/);
        expect(picture.className).toMatch(/\bring-line\b/);
    });

    it.each(["A", "B", "C", "D"] as const)("%s: the one line says to post it and add the song", async (key) => {
        await openSheet(PHONES[key]);

        expect(screen.getByText(STORY_LINE)).toBeTruthy();
        expect(hasText(COMPUTER_LINE)).toBe(false);
    });

    it.each(["A", "B", "C", "D", "E"] as const)("%s: the long instructions are gone", async (key) => {
        await openSheet(PHONES[key]);

        for (const gone of [
            "That's the whole trend",
            "Full screen",
            "Having trouble?",
            "Add Yours",
            "TikTok:",
            "Open in Spotify",
            "Copy link again",
            "Tap the music note",
            "Send to Instagram",
            "isn't copied anymore",
        ]) {
            expect([gone, hasText(gone)]).toEqual([gone, false]);
        }
        expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    });

    it.each(["A", "B", "C", "D", "E"] as const)("%s: New to this? folds three short lines", async (key) => {
        await openSheet(PHONES[key]);

        const help = screen.getByText("New to this?").closest("details")!;
        expect(help.open).toBe(false);
        expect(
            within(help)
                .getAllByRole("listitem")
                .map((li) => li.textContent),
        ).toEqual([
            "Save the picture.",
            "In Instagram or TikTok, start a Story and pick the picture.",
            `Add music and search "${SEARCH}". On Instagram, add a Link sticker and paste the link.`,
        ]);
        // big enough to tap
        expect(within(help).getByText("New to this?").className).toMatch(/\bmin-h-11\b/);
    });

    it.each(["A", "B", "C", "D", "E"] as const)("%s: Copy link and Copy song name sit side by side", async (key) => {
        await openSheet(PHONES[key]);

        const copyLink = button("Copy link");
        expect(copyLink.parentElement).toBe(button("Copy song name").parentElement);
    });
});

describe("ShareSheet screens", () => {
    it("A (iPhone, inside Instagram): press and hold, Share picture when it can, and a way out", async () => {
        await openSheet(PHONES.A);

        expect(screen.getByText(HOLD_LINE)).toBeTruthy();
        expect(button("Share picture").className).toMatch(/bg-brand-blue/);
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
        expect(link("Can't save? Open in your browser").getAttribute("href")).toBe(
            "instagram://extbrowser/?url=" +
                encodeURIComponent("http://localhost/17?week=2001-06-09&year=2001&kind=seventeen&share=1"),
        );
    });

    it("A without picture sharing: no main button, the press and hold line covers it", async () => {
        await openSheet({ ...PHONES.A, share: false, files: false });

        expect(screen.getByText(HOLD_LINE)).toBeTruthy();
        expect(noButton("Share picture")).toBeNull();
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
        expect(noButton("Send to a friend")).toBeNull();
    });

    it("B (iPhone, Safari): Share picture is the main button, and no escape links", async () => {
        await openSheet(PHONES.B);

        expect(button("Share picture").className).toMatch(/bg-brand-blue/);
        expect(hasText(HOLD_LINE)).toBe(false);
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
        expect(hasText("Open in your browser")).toBe(false);
    });

    // a Save picture link on an iPhone lands in Files, which Instagram can't pick from
    it("B without picture sharing: falls back to press and hold, not a download", async () => {
        await openSheet({ ...PHONES.B, files: false });

        expect(noButton("Share picture")).toBeNull();
        expect(screen.getByText(HOLD_LINE)).toBeTruthy();
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
    });

    // nothing to share, and a download would land in Files, so press and hold it is
    it.each([
        ["answers with an error", async () => ({ ok: false })],
        ["can't connect", async () => Promise.reject(new Error("offline"))],
    ])("B when the picture fetch %s: press and hold, no Save picture", async (_, fail) => {
        global.fetch = jest.fn(fail) as unknown as typeof fetch;
        await openSheet(PHONES.B);

        expect(screen.getByText(HOLD_LINE)).toBeTruthy();
        expect(noButton("Share picture")).toBeNull();
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
    });

    it("C (Android, inside Instagram): leaving is the main button, and nothing says press and hold", async () => {
        await openSheet(PHONES.C);

        const escape = link("Open in your browser");
        expect(escape.getAttribute("href")).toMatch(/^intent:\/\/.*#Intent;scheme=http;end$/);
        expect(escape.className).toMatch(/bg-brand-blue/);
        expect(screen.getByText("Instagram's browser here can't save pictures.")).toBeTruthy();
        expect(hasText("Press and hold the picture")).toBe(false);
        expect(noButton("Share picture")).toBeNull();
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
        // no share menu here, so no Send to a friend either
        expect(noButton("Send to a friend")).toBeNull();
    });

    it("D (Android, Chrome): Share picture is the main button", async () => {
        await openSheet(PHONES.D);

        expect(button("Share picture").className).toMatch(/bg-brand-blue/);
        expect(screen.queryByRole("link", { name: "Save picture" })).toBeNull();
        expect(hasText(HOLD_LINE)).toBe(false);
        expect(hasText("Open in your browser")).toBe(false);
    });

    it("D without picture sharing: Save picture downloads it", async () => {
        await openSheet({ ...PHONES.D, files: false });

        expect(noButton("Share picture")).toBeNull();
        const save = link("Save picture");
        expect(save.getAttribute("download")).toBe("my-2027-song.png");
        expect(save.getAttribute("href")).toBe("/api/share-image?week=2001-06-09&year=2001&kind=seventeen");
        expect(save.className).toMatch(/bg-brand-blue/);
    });

    // a failed picture fetch leaves nothing to share, so the download comes back
    it("D: a failed picture fetch falls back to Save picture", async () => {
        global.fetch = jest.fn(async () => ({ ok: false })) as unknown as typeof fetch;
        await openSheet(PHONES.D);

        expect(noButton("Share picture")).toBeNull();
        expect(link("Save picture").getAttribute("download")).toBe("my-2027-song.png");
    });

    it("E (a computer): Save picture, the computer line, and no Share picture even when it could", async () => {
        await openSheet(PHONES.E);

        expect(screen.getByText(COMPUTER_LINE)).toBeTruthy();
        expect(hasText(STORY_LINE)).toBe(false);
        expect(link("Save picture").getAttribute("download")).toBe("my-2027-song.png");
        expect(noButton("Share picture")).toBeNull();
        expect(hasText(HOLD_LINE)).toBe(false);
        expect(hasText("Open in your browser")).toBe(false);
    });
});

describe("ShareSheet clipboard", () => {
    it("says Link copied only after the link was copied", async () => {
        await openSheet(PHONES.B);
        expect(noButton("Link copied")).toBeNull();

        await act(async () => fireEvent.click(button("Copy link")));

        expect(writeText).toHaveBeenLastCalledWith(LINK);
        expect(button("Link copied")).toBeTruthy();
    });

    it("after the song name, Copy link just says Copy link so it can be copied again", async () => {
        await openSheet(PHONES.B);
        await act(async () => fireEvent.click(button("Copy link")));

        await act(async () => fireEvent.click(button("Copy song name")));

        expect(writeText).toHaveBeenLastCalledWith(SEARCH);
        expect(button("Song name copied")).toBeTruthy();
        expect(noButton("Link copied")).toBeNull();

        await act(async () => fireEvent.click(button("Copy link")));

        expect(writeText).toHaveBeenLastCalledWith(LINK);
        expect(button("Link copied")).toBeTruthy();
        expect(button("Copy song name")).toBeTruthy();
    });

    it("no reminder shows up when they come back after copying the song", async () => {
        await openSheet(PHONES.D);
        await act(async () => fireEvent.click(button("Copy song name")));

        act(() => {
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(button("Copy link")).toBeTruthy();
        expect(hasText("isn't copied anymore")).toBe(false);
    });

    it("when copying fails, shows the link and says to press and hold it", async () => {
        await openSheet(PHONES.A);
        const field = screen.getByDisplayValue(LINK);
        // there to select for the old copy command, out of sight until it's needed
        expect(field.className).toMatch(/\bsr-only\b/);
        expect(hasText("Press and hold the link to copy it.")).toBe(false);
        writeText.mockRejectedValue(new Error("no clipboard"));
        document.execCommand = () => false;

        await act(async () => fireEvent.click(button("Copy link")));

        expect(field.className).not.toMatch(/\bsr-only\b/);
        expect(screen.getByText("Press and hold the link to copy it.")).toBeTruthy();
        expect(noButton("Link copied")).toBeNull();
    });

    // pasted straight into Spotify, Instagram or TikTok's music search
    it("Copy song name copies the title and lead artist, cleaned up the same as the Spotify search", async () => {
        await openSheet(PHONES.B, { title: "Break Your Heart", artist: "Taio Cruz Featuring Ludacris" });

        await act(async () => fireEvent.click(button("Copy song name")));

        expect(writeText).toHaveBeenLastCalledWith("Break Your Heart Taio Cruz");
        expect(button("Song name copied")).toBeTruthy();
        const help = screen.getByText("New to this?").closest("details")!;
        expect(within(help).getAllByRole("listitem")[2].textContent).toBe(
            'Add music and search "Break Your Heart Taio Cruz". On Instagram, add a Link sticker and paste the link.',
        );
    });

    it("with no clipboard, the song copies from its own hidden field with the old copy command", async () => {
        await openSheet(PHONES.A);
        const field = screen.getByDisplayValue(SEARCH) as HTMLInputElement;
        // out of sight, never a Tab stop, and 16px so focusing it doesn't zoom an iPhone
        expect(field.readOnly).toBe(true);
        expect(field.tabIndex).toBe(-1);
        expect(field.className).toMatch(/\bsr-only\b/);
        expect(field.className).toMatch(/\btext-base\b/);
        writeText.mockRejectedValue(new Error("no clipboard"));
        let selected = "";
        document.execCommand = jest.fn(() => {
            const active = document.activeElement as HTMLInputElement;
            selected = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0);
            return true;
        });

        await act(async () => fireEvent.click(button("Copy song name")));

        expect(document.execCommand).toHaveBeenCalledWith("copy");
        expect(selected).toBe(SEARCH);
        expect(button("Song name copied")).toBeTruthy();
        // the field it used can't be seen, so focus goes back to the button
        expect(document.activeElement).toBe(button("Song name copied"));
    });

    it("when copying the song fails, says to type it, with the text to type", async () => {
        await openSheet(PHONES.A);
        writeText.mockRejectedValue(new Error("no clipboard"));
        document.execCommand = () => false;

        await act(async () => fireEvent.click(button("Copy song name")));

        expect(screen.getByText(`Copy didn't work. Type "${SEARCH}" instead.`)).toBeTruthy();
        expect(noButton("Song name copied")).toBeNull();
        expect(screen.getByDisplayValue(SEARCH).className).toMatch(/\bsr-only\b/);
        expect(document.activeElement).toBe(button("Copy song name"));
        // the link's field stays hidden: only the song failed
        expect(screen.getByDisplayValue(LINK).className).toMatch(/\bsr-only\b/);
        expect(hasText("Press and hold the link to copy it.")).toBe(false);
    });
});

describe("ShareSheet share menu", () => {
    it.each(["A", "B", "D"] as const)("%s: Share picture sends the picture alone, right in the tap", async (key) => {
        await openSheet(PHONES[key]);

        // no act: share() has to run before the tap handler awaits anything
        fireEvent.click(button("Share picture"));

        expect(share).toHaveBeenCalledTimes(1);
        const data = share.mock.calls[0][0];
        expect(Object.keys(data)).toEqual(["files"]);
        expect(data.files).toHaveLength(1);
        expect(data.files[0]).toBeInstanceOf(File);
        expect([data.files[0].name, data.files[0].type]).toEqual(["my-2027-song.png", "image/png"]);
        await act(async () => {});
    });

    // the picture is fetched when the sheet opens, so for a moment there's nothing to share yet
    it("Share picture waits for the picture: same label, faded, no hover, and a tap does nothing", async () => {
        let arrive = () => {};
        global.fetch = jest.fn(
            () =>
                new Promise((resolve) => {
                    arrive = () => resolve({ ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) });
                }),
        ) as unknown as typeof fetch;
        await openSheet(PHONES.B);

        const waiting = button("Share picture");
        expect(waiting.getAttribute("aria-disabled")).toBe("true");
        expect(waiting.className).toMatch(/\bopacity-60\b/);
        expect(waiting.className).not.toMatch(/hover:/);
        fireEvent.click(waiting);
        expect(share).not.toHaveBeenCalled();

        await act(async () => arrive());

        const ready = button("Share picture");
        expect(ready.getAttribute("aria-disabled")).toBeNull();
        expect(ready.className).not.toMatch(/\bopacity-60\b/);
        expect(ready.className).toMatch(/hover:bg-brand-blue/);
        fireEvent.click(ready);
        expect(share).toHaveBeenCalledTimes(1);
        await act(async () => {});
    });

    it("Send to a friend sends the link and the question, no picture", async () => {
        await openSheet(PHONES.D);

        await act(async () => fireEvent.click(button("Send to a friend")));

        expect(share).toHaveBeenCalledWith({ url: LINK, text: "What was #1 on your 17th birthday?" });
        expect(Object.keys(share.mock.calls[0][0]).sort()).toEqual(["text", "url"]);
    });
});
