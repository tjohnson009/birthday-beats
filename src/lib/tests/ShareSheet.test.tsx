/**
 * @jest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import ShareSheet from "@/components/ShareSheet";

// the share sheet's rules from the share flow spec: which buttons each screen shows, the one-thing clipboard,
// the return reminder, and what each share sends. phones are faked by their user agent

const LINK = "https://birthday-beats.vercel.app/17";
const TITLE = "Lady Marmalade";
const AGAIN_LINE = "Your link isn't copied anymore. Copy it for the Link sticker.";

type Phone = { userAgent: string; platform: string; maxTouchPoints: number; canShare: boolean };

const PHONES: Record<"A" | "B" | "C" | "D" | "E", Phone> = {
    // A: iPhone, inside Instagram
    A: {
        userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 356.0.0.32.111 (iPhone15,3; iOS 18_1; en_US; en; scale=3.00; 1290x2796; 654891233)",
        platform: "iPhone",
        maxTouchPoints: 5,
        canShare: true,
    },
    // B: iPhone, Safari
    B: {
        userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
        canShare: true,
    },
    // C: Android, inside Instagram, which has no share menu
    C: {
        userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 343.0.0.38.94 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 630156200)",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
        canShare: false,
    },
    // D: Android, Chrome
    D: {
        userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
        canShare: true,
    },
    // E: a computer
    E: {
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
        canShare: true,
    },
};

const setNavigator = (name: string, value: unknown) =>
    Object.defineProperty(navigator, name, { value, configurable: true });

let share: jest.Mock;
let writeText: jest.Mock;

// waits for the picture fetch too, so its update lands inside the test
const openSheet = async (phone: Phone) => {
    setNavigator("userAgent", phone.userAgent);
    setNavigator("platform", phone.platform);
    setNavigator("maxTouchPoints", phone.maxTouchPoints);
    share = jest.fn(async () => {});
    setNavigator("share", phone.canShare ? share : undefined);
    setNavigator("canShare", phone.canShare ? () => true : undefined);
    writeText = jest.fn(async () => {});
    setNavigator("clipboard", { writeText });
    render(
        <ShareSheet
            week="2001-06-09"
            year="2001"
            kind="seventeen"
            title={TITLE}
            artist="Christina Aguilera, Lil' Kim, Mya & P!nk"
            spotifyId="4uLU6hMCjMI75M1A2tKUQC"
            onClose={() => {}}
        />,
    );
    await act(async () => {});
};

const stepThree = () => screen.getByRole("heading", { name: "3. In Instagram" }).closest("section")!;
const stepOne = () => screen.getByRole("heading", { name: "1. Copy the link" }).closest("section")!;
const button = (name: string) => screen.getByRole("button", { name });
const hasText = (text: string) => (document.body.textContent ?? "").includes(text);

// they switch to Instagram and come back to the page
const leaveAndComeBack = () =>
    act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
    });

beforeAll(() => {
    // jsdom has no modal dialogs
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
    };
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

beforeEach(() => {
    // the story picture, fetched ahead of the tap for Send to Instagram
    global.fetch = jest.fn(async () => ({
        ok: true,
        blob: async () => new Blob(["png"], { type: "image/png" }),
    })) as unknown as typeof fetch;
});

afterEach(cleanup);

describe("ShareSheet screens", () => {
    it("A (iPhone, inside Instagram): no Save picture, no Send to Instagram, no song button in step 3", async () => {
        await openSheet(PHONES.A);

        expect(screen.queryByText("Save picture")).toBeNull();
        expect(screen.queryByRole("button", { name: "Send to Instagram" })).toBeNull();
        expect(within(stepThree()).queryByRole("button", { name: "Copy song name" })).toBeNull();
        expect(hasText("This replaces the copied link")).toBe(false);
        expect(hasText("Close this page (tap X at the top). Then:")).toBe(true);
    });

    it("C (Android, inside Instagram): never says to press and hold the picture, and leaves by a tapped link", async () => {
        await openSheet(PHONES.C);

        expect(hasText("Press and hold the picture")).toBe(false);
        expect(screen.queryByText("Save picture")).toBeNull();
        expect(screen.getByRole("link", { name: "Open in your browser" }).getAttribute("href")).toMatch(
            /^intent:\/\/.*#Intent;scheme=http;end$/,
        );
        // no share menu here, so no Send to a friend either
        expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
    });

    it.each(["B", "D"] as const)(
        "%s (a real browser): step 3 has Copy song name and the warning under it",
        async (key) => {
            await openSheet(PHONES[key]);

            expect(within(stepThree()).getByRole("button", { name: "Copy song name" })).toBeTruthy();
            expect(within(stepThree()).getByText(/This replaces the copied link\./)).toBeTruthy();
        },
    );

    // iPhones with a Home button (SE) take screenshots with side and Home
    it.each([
        ["A", "press the side and volume up buttons together, or the side and Home buttons"],
        ["B", "press the side and volume up buttons together, or the side and Home buttons"],
        ["C", "hold the power and volume down buttons"],
        ["D", "hold the power and volume down buttons"],
    ] as const)("%s: the Full screen hint names that phone's screenshot buttons", async (key, buttons) => {
        await openSheet(PHONES[key]);

        expect(hasText(`Take a screenshot (${buttons}). Tap to close.`)).toBe(true);
    });

    it("E (a computer): download and copy, with the Instagram steps folded away", async () => {
        await openSheet(PHONES.E);

        expect(screen.getByRole("link", { name: "Download picture" }).getAttribute("download")).toBe(
            "my-2027-song.png",
        );
        expect(button("Copy link")).toBeTruthy();
        expect(screen.getByText("What to do in Instagram")).toBeTruthy();
        expect(hasText("Having trouble?")).toBe(false);
    });
});

describe("ShareSheet clipboard", () => {
    it("says Link copied only after the link was copied", async () => {
        await openSheet(PHONES.B);
        expect(screen.queryByRole("button", { name: "Link copied" })).toBeNull();

        await act(async () => fireEvent.click(button("Copy link")));

        expect(writeText).toHaveBeenLastCalledWith(LINK);
        expect(button("Link copied")).toBeTruthy();
    });

    it("drops Link copied once the song name takes its place", async () => {
        await openSheet(PHONES.B);
        await act(async () => fireEvent.click(button("Copy link")));

        await act(async () => fireEvent.click(within(stepThree()).getByRole("button", { name: "Copy song name" })));

        expect(writeText).toHaveBeenLastCalledWith(TITLE);
        expect(screen.queryByRole("button", { name: "Link copied" })).toBeNull();
        expect(within(stepOne()).getByRole("button", { name: "Copy link" })).toBeTruthy();
        expect(within(stepThree()).getByRole("button", { name: "Song name copied" })).toBeTruthy();
    });

    it("doesn't nag on return while the link is still the thing copied", async () => {
        await openSheet(PHONES.B);
        await act(async () => fireEvent.click(button("Copy link")));

        leaveAndComeBack();

        expect(screen.queryByRole("button", { name: "Copy link again" })).toBeNull();
        expect(hasText(AGAIN_LINE)).toBe(false);
    });

    it.each(["B", "D"] as const)(
        "%s: after the song name, coming back asks for the link again in step 1",
        async (key) => {
            await openSheet(PHONES[key]);
            await act(async () => fireEvent.click(within(stepThree()).getByRole("button", { name: "Copy song name" })));

            leaveAndComeBack();

            const again = within(stepOne()).getByRole("button", { name: "Copy link again" });
            expect(again.className).toMatch(/bg-brand-blue/);
            expect(within(stepOne()).getByText(AGAIN_LINE)).toBeTruthy();
        },
    );

    // they come back to the song step, a long way under step 1, so the reminder has to be there too
    it.each(["B", "D"] as const)(
        "%s: the reminder and a main Copy link again also show in step 3, where they come back",
        async (key) => {
            await openSheet(PHONES[key]);
            await act(async () => fireEvent.click(within(stepThree()).getByRole("button", { name: "Copy song name" })));

            leaveAndComeBack();

            const again = within(stepThree()).getByRole("button", { name: "Copy link again" });
            expect(again.className).toMatch(/bg-brand-blue/);
            expect(within(stepThree()).getByText(AGAIN_LINE)).toBeTruthy();

            await act(async () => fireEvent.click(again));

            expect(writeText).toHaveBeenLastCalledWith(LINK);
            // the tap is answered where it happened, and the line goes away
            expect(within(stepThree()).getByRole("button", { name: "Link copied" })).toBeTruthy();
            expect(within(stepOne()).getByRole("button", { name: "Link copied" })).toBeTruthy();
            expect(hasText(AGAIN_LINE)).toBe(false);
        },
    );
});

describe("ShareSheet share menu", () => {
    it("Send to Instagram sends the picture alone", async () => {
        await openSheet(PHONES.B);
        const send = await screen.findByRole("button", { name: "Send to Instagram" });

        await act(async () => fireEvent.click(send));

        expect(share).toHaveBeenCalledTimes(1);
        const data = share.mock.calls[0][0];
        expect(Object.keys(data)).toEqual(["files"]);
        expect(data.files).toHaveLength(1);
        expect(data.files[0]).toBeInstanceOf(File);
        expect([data.files[0].name, data.files[0].type]).toEqual(["my-2027-song.png", "image/png"]);
    });

    it("Send to a friend sends the link and the question, no picture", async () => {
        await openSheet(PHONES.D);

        await act(async () => fireEvent.click(button("Send to a friend")));

        expect(share).toHaveBeenCalledWith({ url: LINK, text: "What was #1 on your 17th birthday?" });
        expect(Object.keys(share.mock.calls[0][0]).sort()).toEqual(["text", "url"]);
    });
});
