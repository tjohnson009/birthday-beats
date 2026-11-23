/**
 * @jest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BirthdayBeats from "@/components/BirthdayBeats";
import { buildStripData } from "@/lib/chartStrip";
import type { SongResult } from "@/lib/songResult";

// the chart strip waits for Go: it stays hidden until the first search, then sits on the song on screen,
// and a new date in the picker leaves it there until Go. fetch is faked, so nothing here reaches /api/song

const WEEKS = [
    { date: "1968-07-06", song: "This Guy's In Love With You", artist: "Herb Alpert" },
    { date: "1968-07-13", song: "This Guy's In Love With You", artist: "Herb Alpert" },
    { date: "1968-07-20", song: "Grazing In The Grass", artist: "Hugh Masekela" },
    { date: "1985-07-06", song: "Sussudio", artist: "Phil Collins" },
    { date: "1985-07-13", song: "A View To A Kill", artist: "Duran Duran" },
    { date: "1985-07-20", song: "A View To A Kill", artist: "Duran Duran" },
    { date: "1985-07-27", song: "Everytime You Go Away", artist: "Paul Young" },
    { date: "1999-06-05", song: "Livin' La Vida Loca", artist: "Ricky Martin" },
    { date: "1999-06-12", song: "If You Had My Love", artist: "Jennifer Lopez" },
];
const WEEK_PX = 4; // the strip's width per week

// every /api/song call, in order
let songRequests: string[];

const answer = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

// stands in for the server: the chart week on or before the date, with no Spotify details
const fakeFetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/chart") return answer(buildStripData(WEEKS));
    if (url.startsWith("/api/song")) {
        songRequests.push(url);
        const date = new URLSearchParams(url.split("?")[1]).get("date")!;
        const week = WEEKS.filter((w) => w.date <= date).at(-1) ?? WEEKS[0];
        const result: SongResult = {
            chartDate: week.date,
            title: week.song,
            artist: week.artist,
            videoId: null,
            spotify: null,
            spotifyStatus: "not-found",
        };
        return answer(result);
    }
    if (url.startsWith("/api/share-image")) {
        return { ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
};

const strip = () => screen.queryByRole("slider", { name: "Browse every #1 by week" });
// what the strip is showing, as its screen reader text: "July 13, 1985: A View To A Kill by Duran Duran, ..."
const stripSays = () => strip()?.getAttribute("aria-valuetext");
const song = (title: string) => screen.findByRole("heading", { name: title, level: 2 });

// the strip's chart data comes back right after the first render
const renderPage = async (trend = false) => {
    render(<BirthdayBeats heroTitles={[]} trend={trend} />);
    await act(async () => {});
};

const pickDate = (date: string) => {
    const [year, month, day] = date.split("-");
    fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: String(Number(year)) } });
    fireEvent.change(screen.getByRole("combobox", { name: "Month" }), { target: { value: String(Number(month)) } });
    fireEvent.change(screen.getByRole("combobox", { name: "Day" }), { target: { value: String(Number(day)) } });
};

const go = () => fireEvent.click(screen.getByRole("button", { name: "Go!" }));

// long enough for the strip to settle (150ms) and ask for a song, if it was going to
const waitForStripToSettle = () => act(() => new Promise((resolve) => setTimeout(resolve, 400)));

beforeAll(() => {
    // jsdom does no layout: the strip never gets a size, and scrolling only moves when told to
    global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    Element.prototype.scrollTo = function (this: Element, options?: ScrollToOptions | number) {
        if (typeof options === "object" && options.left !== undefined) this.scrollLeft = options.left;
        this.dispatchEvent(new Event("scroll"));
    } as Element["scrollTo"];
    // jsdom has no modal dialogs (the share sheet opens one)
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.removeAttribute("open");
    };
});

beforeEach(() => {
    songRequests = [];
    global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
});

// the switch between the birthday's #1 and the 17th birthday's #1 lives on /17 only. the home page is for any
// date, so its result is just that date's #1, and the header link is the way to /17
describe("the 17th birthday switch", () => {
    // any of the switch's labels
    const birthdaySwitch = () =>
        screen.queryByRole("button", { name: /17th birthday|turn 17|day you were born|Charts start/ });
    const share = () => fireEvent.click(screen.getByRole("button", { name: "Share to your Story" }));
    const sharePicture = () => screen.getByRole("img", { name: "Your song as a Story picture" }).getAttribute("src");

    it("isn't on a home page result, which shows only that date's #1", async () => {
        await renderPage();
        pickDate("1968-07-15");
        go();

        expect(await song("This Guy's In Love With You")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Share to your Story" })).toBeTruthy();
        expect(birthdaySwitch()).toBeNull();
        expect(screen.queryByText(/#1 on your 17th birthday/)).toBeNull();
        expect(songRequests).toEqual(["/api/song?date=1968-07-15"]);
    });

    it("isn't on the home page for a date whose 17th birthday is still to come", async () => {
        await renderPage();
        pickDate("2015-03-02");
        go();

        expect(await song("If You Had My Love")).toBeTruthy();
        expect(birthdaySwitch()).toBeNull();
        expect(screen.queryByText(/You turn 17/)).toBeNull();
    });

    it("leaves home page Share with the birthday card", async () => {
        await renderPage();
        pickDate("1968-07-15");
        go();
        await song("This Guy's In Love With You");

        share();

        expect(sharePicture()).toBe("/api/share-image?week=1968-07-13&year=1968&kind=born");
    });

    it("stays on /17, from the 17th birthday back to the day you were born and over again", async () => {
        await renderPage(true);
        pickDate("1968-07-15");
        go();

        expect(await song("A View To A Kill")).toBeTruthy();
        expect(screen.getByText("#1 on your 17th birthday · Jul 15, 1985")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Back to the day you were born" }));

        expect(await song("This Guy's In Love With You")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /Your 17th birthday #1/ }));

        expect(await song("A View To A Kill")).toBeTruthy();
        // the second trip to the 17th birthday comes from the saved result, not a new lookup
        expect(songRequests).toEqual(["/api/song?date=1985-07-15", "/api/song?date=1968-07-15"]);
        share();
        expect(sharePicture()).toBe(
            "/api/share-image?week=1985-07-13&year=1985&kind=seventeen&style=now-playing&color=blue",
        );
    });
});

describe("the chart strip waits for Go", () => {
    it("is hidden before the first search, then sits on the week of the result", async () => {
        await renderPage();

        expect(strip()).toBeNull();
        expect(screen.queryByText(/A View To A Kill/)).toBeNull();

        pickDate("1985-07-15");
        expect(strip()).toBeNull();

        go();

        expect(await song("A View To A Kill")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill by Duran Duran/);
    });

    it("doesn't give the song away while the result is still loading", async () => {
        // hold the song's answer until the test lets it go
        let release = () => {};
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            if (String(input).startsWith("/api/song")) await new Promise<void>((resolve) => (release = resolve));
            return fakeFetch(input);
        }) as unknown as typeof fetch;
        await renderPage();

        pickDate("1985-07-15");
        go();
        await act(async () => {});
        expect(strip()).toBeNull();
        expect(screen.queryByText(/A View To A Kill/)).toBeNull();

        await act(async () => release());
        expect(await song("A View To A Kill")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);

        // a second Go keeps the strip on the song still on screen until the new one arrives
        pickDate("1999-06-14");
        go();
        await act(async () => {});
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
        expect(screen.queryByText(/If You Had My Love/)).toBeNull();

        await act(async () => release());
        expect(await song("If You Had My Love")).toBeTruthy();
        expect(stripSays()).toMatch(/^June 12, 1999: If You Had My Love/);
    });

    it("doesn't give a shared song away while it is still loading", async () => {
        let release = () => {};
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            if (String(input).startsWith("/api/song")) await new Promise<void>((resolve) => (release = resolve));
            return fakeFetch(input);
        }) as unknown as typeof fetch;
        window.history.replaceState(null, "", "/?week=1985-07-13&year=1985&kind=born&share=1");
        await renderPage();
        expect(strip()).toBeNull();

        await act(async () => release());
        expect(await song("A View To A Kill")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
    });

    it("shows up after a quick pick too", async () => {
        await renderPage();
        expect(strip()).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Today" }));

        // today is past the last test week, so it lands there
        expect(await song("If You Had My Love")).toBeTruthy();
        expect(stripSays()).toMatch(/^June 12, 1999: If You Had My Love/);
    });

    it("stays on the song on screen when the date picker changes, and asks for nothing", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");
        const requestsAfterGo = songRequests.length;

        pickDate("1999-06-14");
        await waitForStripToSettle();

        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
        expect(screen.getByRole("heading", { name: "A View To A Kill", level: 2 })).toBeTruthy();
        expect(songRequests).toHaveLength(requestsAfterGo);
    });

    it("moves to the new week when Go is pressed", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");

        pickDate("1999-06-14");
        go();

        expect(await song("If You Had My Love")).toBeTruthy();
        // the strip slides over once the new song is on screen
        await waitFor(() => expect(stripSays()).toMatch(/^June 12, 1999: If You Had My Love/));
        expect(songRequests.at(-1)).toBe("/api/song?date=1999-06-14");
    });

    it("shows up on the shared week when a shared link opens a result", async () => {
        window.history.replaceState(null, "", "/?week=1985-07-13&year=1985&kind=born&share=1");
        await renderPage();

        expect(await song("A View To A Kill")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
    });

    it("stays up when the person lets go of it on a shared result without moving it", async () => {
        window.history.replaceState(null, "", "/?week=1985-07-13&year=1985&kind=born&share=1");
        await renderPage();
        await song("A View To A Kill");

        // a click or a tiny nudge: the person touches the strip, but it stays on the shared week
        const track = strip()!;
        fireEvent.wheel(track);
        track.scrollLeft = 4 * WEEK_PX + WEEK_PX / 2;
        fireEvent.scroll(track);

        await waitFor(() => expect(songRequests.at(-1)).toBe("/api/song?date=1985-07-13&source=strip&mode=peek"));
        await waitForStripToSettle();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
    });

    it("on /17, sits on the 17th birthday's week and follows the switch back to the birthday", async () => {
        await renderPage(true);
        pickDate("1968-07-15");
        go();

        expect(await song("A View To A Kill")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);

        fireEvent.click(screen.getByRole("button", { name: "Back to the day you were born" }));

        expect(await song("This Guy's In Love With You")).toBeTruthy();
        await waitFor(() => expect(stripSays()).toMatch(/^July 13, 1968: This Guy's In Love With You/));
    });

    it("still loads a song when the person moves the strip", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");

        // a wheel marks the move as the person's, then the track scrolls on to July 27
        const track = strip()!;
        fireEvent.wheel(track);
        track.scrollLeft = 6 * WEEK_PX + WEEK_PX / 2;
        fireEvent.scroll(track);

        await waitFor(() => expect(songRequests.at(-1)).toBe("/api/song?date=1985-07-27&source=strip&mode=peek"));
        expect(await song("Everytime You Go Away")).toBeTruthy();
        expect(stripSays()).toMatch(/^July 27, 1985: Everytime You Go Away/);
    });
});
