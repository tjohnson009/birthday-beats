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
const fakeServer = (weeks: typeof WEEKS) => async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/chart") return answer(buildStripData(weeks));
    if (url.startsWith("/api/song")) {
        songRequests.push(url);
        const date = new URLSearchParams(url.split("?")[1]).get("date")!;
        const week = weeks.filter((w) => w.date <= date).at(-1) ?? weeks[0];
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
const fakeFetch = fakeServer(WEEKS);

const strip = () => screen.queryByRole("slider", { name: "Browse every #1 by week" });
// what the strip is showing, as its screen reader text: "July 13, 1985: A View To A Kill by Duran Duran, ..."
const stripSays = () => strip()?.getAttribute("aria-valuetext");
const stripLine = (title: string, artist: string) => screen.queryByText(`${title} · ${artist}`);
const pressGoNote = () => screen.queryByText(/^Press Go to see the #1 for /);
const findingNote = () => screen.queryByText(/^Finding the #1 /);
// a note counts only inside the strip's polite status line, so screen readers hear it
const statusNote = (text: string) => screen.queryByText(text)?.closest('[role="status"]') ?? null;
const song = (title: string) => screen.findByRole("heading", { name: title, level: 2 });

// from here on, every /api/song answer waits until the test calls release(), which lets the newest one go.
// asked lists each held request as it is made
const holdSongAnswers = (server = fakeFetch) => {
    const held = { asked: [] as string[], release: () => {} };
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith("/api/song")) {
            held.asked.push(String(input));
            await new Promise<void>((resolve) => (held.release = resolve));
        }
        return server(input);
    }) as unknown as typeof fetch;
    return held;
};

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

// the person touches the strip (a wheel marks the scroll as theirs) and it scrolls to the given week.
// jsdom leaves the track at the far left, so scrolling to the week it shows is a tap that moves nothing
const scrollStripTo = (week: number) => {
    const track = strip()!;
    fireEvent.wheel(track);
    track.scrollLeft = week * WEEK_PX + WEEK_PX / 2;
    fireEvent.scroll(track);
};

const pickerSays = () =>
    ["Year", "Month", "Day"].map((name) => (screen.getByRole("combobox", { name }) as HTMLSelectElement).value);

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

// the home page links to /17 with the date filled in, where the switch used to be. /17 keeps its switch
describe("the 17th birthday from the home page", () => {
    const invitation = () => screen.queryByRole("link", { name: "What was #1 on your 17th birthday?" });
    // the picker as month/day/year: "7/15/1968"
    const pickerSays = () =>
        ["Month", "Day", "Year"]
            .map((name) => (screen.getByRole("combobox", { name }) as HTMLSelectElement).value)
            .join("/");

    it("links to /17 with the date filled in, instead of the switch", async () => {
        await renderPage();
        pickDate("1968-07-15");
        go();
        await song("This Guy's In Love With You");

        expect(invitation()?.getAttribute("href")).toBe("/17?birthday=1968-07-15");
        expect(screen.queryByRole("button", { name: /17th birthday/ })).toBeNull();
    });

    it("leaves the link out when the 17th birthday has no chart yet", async () => {
        await renderPage();
        pickDate("2015-06-14");
        go();
        await song("If You Had My Love");

        expect(invitation()).toBeNull();
    });

    it("shares the date's own card", async () => {
        await renderPage();
        pickDate("1968-07-15");
        go();
        await song("This Guy's In Love With You");

        fireEvent.click(screen.getByRole("button", { name: "Share to your Story" }));

        expect(screen.getByRole("img", { name: "Your song as a Story picture" }).getAttribute("src")).toBe(
            "/api/share-image?week=1968-07-13&year=1968&kind=born",
        );
    });

    it("lands on /17 with the birthday in the picker, and waits for Go", async () => {
        window.history.replaceState(null, "", "/17?birthday=1968-07-15");
        await renderPage(true);

        expect(pickerSays()).toBe("7/15/1968");
        await waitForStripToSettle();
        expect(songRequests).toEqual([]);

        go();

        expect(await song("A View To A Kill")).toBeTruthy();
        expect(songRequests).toEqual(["/api/song?date=1985-07-15"]);
        expect(screen.getByRole("button", { name: "Back to the day you were born" })).toBeTruthy();
    });

    it("takes the birthday out of the address once it's in the picker, so a copied address doesn't carry it", async () => {
        window.history.replaceState(null, "", "/17?birthday=1968-07-15");
        await renderPage(true);

        expect(pickerSays()).toBe("7/15/1968");
        expect(window.location.pathname + window.location.search).toBe("/17");

        go();
        expect(await song("A View To A Kill")).toBeTruthy();
        expect(songRequests).toEqual(["/api/song?date=1985-07-15"]);
    });

    it("ignores a birthday on /17 that isn't a real date in the picker's range", async () => {
        const [year, month, day] = new Date().toLocaleDateString("en-CA").split("-").map(Number);
        for (const birthday of ["1968-02-30", "1930-01-01", "not-a-date"]) {
            window.history.replaceState(null, "", `/17?birthday=${birthday}`);
            await renderPage(true);
            expect(pickerSays()).toBe(`${month}/${day}/${year}`);
            cleanup();
        }
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

    it("leaves a shared result alone when the person lets go of the strip without moving it", async () => {
        window.history.replaceState(null, "", "/?week=1985-07-13&year=1985&kind=born&share=1");
        await renderPage();
        await song("A View To A Kill");
        const requestsBefore = songRequests.length;

        // a click or a tiny nudge: the person touches the strip, but it stays on the shared week
        scrollStripTo(4);
        await waitForStripToSettle();

        expect(songRequests).toHaveLength(requestsBefore);
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
        expect(screen.getByText("#1 the week you were born · 1985")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Share to your Story" })).toBeTruthy();
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

describe("a tap on the strip's week already showing", () => {
    it("asks for nothing and keeps the birthday, the picker, the link to /17 and Share", async () => {
        await renderPage();
        // a Monday: the result is the chart week of Saturday, July 13
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");
        const requestsAfterGo = songRequests.length;

        scrollStripTo(4);
        await waitForStripToSettle();

        expect(songRequests).toHaveLength(requestsAfterGo);
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
        expect(pickerSays()).toEqual(["1985", "7", "15"]);
        expect(screen.getByRole("link", { name: "What was #1 on your 17th birthday?" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Share to your Story" })).toBeTruthy();
    });

    it("on /17, keeps the 17th birthday's result", async () => {
        await renderPage(true);
        pickDate("1968-07-15");
        go();
        await song("A View To A Kill");
        const requestsAfterGo = songRequests.length;

        // the strip sits on the 17th birthday's week while the picker shows the birthday
        scrollStripTo(4);
        await waitForStripToSettle();

        expect(songRequests).toHaveLength(requestsAfterGo);
        expect(pickerSays()).toEqual(["1968", "7", "15"]);
        expect(screen.getByText("#1 on your 17th birthday · Jul 15, 1985")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Back to the day you were born" })).toBeTruthy();
    });

    it("asks for nothing after Go lands while a move hadn't come to rest", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");

        // the person moves the strip, then picks a date and presses Go before the strip settles
        scrollStripTo(6);
        pickDate("1999-06-14");
        go();
        await song("If You Had My Love");
        await waitForStripToSettle();
        const requestsAfterGo = songRequests.length;

        scrollStripTo(8);
        await waitForStripToSettle();

        expect(songRequests).toHaveLength(requestsAfterGo);
        expect(songRequests.at(-1)).toBe("/api/song?date=1999-06-14");
        expect(screen.getByRole("button", { name: "Share to your Story" })).toBeTruthy();
    });

    it("still loads it when the person moves the strip away and back", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");

        scrollStripTo(6);
        scrollStripTo(4);

        await waitFor(() => expect(songRequests.at(-1)).toBe("/api/song?date=1985-07-13&source=strip&mode=peek"));
        await waitForStripToSettle();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
    });
});

// after a result, a new date in the picker leaves the strip on the old song. its text would then read as
// that date's #1, so a note asking for Go takes its place until Go or a strip move
describe("the text above the strip after a new date is picked", () => {
    it("becomes a Press Go note for that date, while the strip stays on the old song", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeTruthy();
        expect(pressGoNote()).toBeNull();

        pickDate("1999-06-14");

        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for June 14, 1999");
        expect(pressGoNote()?.closest('[role="status"]')).toBeTruthy();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();
        expect(screen.queryByText("#1 the week of July 13, 1985")).toBeNull();
        expect(screen.queryByText("Week 1 of 2 at #1")).toBeNull();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
    });

    it("gives way to the new song's text once Go is pressed", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");
        pickDate("1999-06-14");

        go();

        expect(pressGoNote()).toBeNull();
        expect(await song("If You Had My Love")).toBeTruthy();
        await waitFor(() => expect(stripLine("If You Had My Love", "Jennifer Lopez")).toBeTruthy());
    });

    it("gives way to the strip's own text as soon as the person moves the strip", async () => {
        await renderPage();
        pickDate("1985-07-15");
        go();
        await song("A View To A Kill");
        pickDate("1999-06-14");
        expect(pressGoNote()).toBeTruthy();

        const track = strip()!;
        fireEvent.wheel(track);
        track.scrollLeft = 6 * WEEK_PX + WEEK_PX / 2;
        fireEvent.scroll(track);

        // mid-move, before the strip comes to rest on July 27 and loads its song
        expect(pressGoNote()).toBeNull();
        expect(stripLine("Everytime You Go Away", "Paul Young")).toBeTruthy();

        await waitForStripToSettle();
        expect(pressGoNote()).toBeNull();
        expect(stripLine("Everytime You Go Away", "Paul Young")).toBeTruthy();
    });

    it("on /17, says the 17th birthday when Go would look that up", async () => {
        await renderPage(true);
        pickDate("1968-07-15");
        go();
        await song("A View To A Kill");

        // turns 17 on June 14, 1999, which has a chart
        pickDate("1982-06-14");

        expect(statusNote("Press Go to see the #1 on your 17th birthday")).toBeTruthy();
        expect(pressGoNote()).toBeNull();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();
    });

    it("on /17, names the picked birthday when its 17th is still to come, since Go shows that day instead", async () => {
        await renderPage(true);
        pickDate("1968-07-15");
        go();
        await song("A View To A Kill");

        // turns 17 in 2032
        pickDate("2015-06-14");

        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for June 14, 2015");
        expect(screen.queryByText("Press Go to see the #1 on your 17th birthday")).toBeNull();
    });

    it("stays away on a shared result until a date is picked", async () => {
        window.history.replaceState(null, "", "/?week=1985-07-13&year=1985&kind=born&share=1");
        await renderPage();
        await song("A View To A Kill");
        expect(pressGoNote()).toBeNull();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeTruthy();

        pickDate("1999-06-14");

        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for June 14, 1999");
    });
});

// once Go is pressed, the strip still waits on the old song until the new one is on screen. its text would
// name that old song meanwhile, so it says what Go is looking for instead
describe("the text above the strip while Go looks up a song", () => {
    // A View To A Kill either way: on /17 it is the #1 on the 17th birthday of July 15, 1968
    const showResult = async (trend = false) => {
        await renderPage(trend);
        pickDate(trend ? "1968-07-15" : "1985-07-15");
        go();
        await song("A View To A Kill");
    };

    it("says Finding for the picked date instead of the old song's text, then shows the new song's text", async () => {
        await showResult();
        const held = holdSongAnswers();
        pickDate("1999-06-14");

        go();
        await act(async () => {});

        expect(statusNote("Finding the #1 for June 14, 1999…")).toBeTruthy();
        expect(pressGoNote()).toBeNull();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();
        expect(screen.queryByText("#1 the week of July 13, 1985")).toBeNull();
        expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);

        await act(async () => held.release());

        expect(await song("If You Had My Love")).toBeTruthy();
        await waitFor(() => expect(stripLine("If You Had My Love", "Jennifer Lopez")).toBeTruthy());
        expect(findingNote()).toBeNull();
    });

    it("names the new song as soon as it is on screen, before the strip has slid over to it", async () => {
        await showResult();
        const held = holdSongAnswers();
        pickDate("1999-06-14");
        go();
        await act(async () => {});
        // like a browser, the strip only hears where its slide got to on a later frame
        const scrollTo = Element.prototype.scrollTo;
        Element.prototype.scrollTo = function (this: Element, options?: ScrollToOptions | number) {
            if (typeof options === "object" && options.left !== undefined) this.scrollLeft = options.left;
        } as Element["scrollTo"];

        try {
            await act(async () => held.release());
            await song("If You Had My Love");

            expect(stripSays()).toMatch(/^July 13, 1985: A View To A Kill/);
            expect(stripLine("If You Had My Love", "Jennifer Lopez")).toBeTruthy();
            expect(screen.queryByText("#1 the week of June 12, 1999")).toBeTruthy();
            expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();
        } finally {
            Element.prototype.scrollTo = scrollTo;
        }
    });

    it("brings the Press Go note back when the lookup fails, next to the error", async () => {
        await showResult();
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            if (String(input).startsWith("/api/song")) throw new TypeError("Failed to fetch");
            return fakeFetch(input);
        }) as unknown as typeof fetch;
        pickDate("1999-06-14");

        go();

        expect(await screen.findByText("Can't reach Birthday Beats")).toBeTruthy();
        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for June 14, 1999");
        expect(findingNote()).toBeNull();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();
    });

    it("gives way to the Press Go note for a date picked before the answer comes", async () => {
        await showResult();
        const held = holdSongAnswers();
        pickDate("1999-06-14");
        go();
        await act(async () => {});
        expect(findingNote()).toBeTruthy();

        pickDate("1968-07-20");

        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for July 20, 1968");
        expect(findingNote()).toBeNull();

        // the June 1999 answer still lands, but it isn't the picked date's #1
        await act(async () => held.release());
        expect(await song("If You Had My Love")).toBeTruthy();
        expect(pressGoNote()?.textContent).toBe("Press Go to see the #1 for July 20, 1968");
        expect(stripLine("If You Had My Love", "Jennifer Lopez")).toBeNull();
    });

    it("gives way to the strip's own text when the person moves the strip during the lookup", async () => {
        await showResult();
        holdSongAnswers();
        pickDate("1999-06-14");
        go();
        await act(async () => {});
        expect(findingNote()).toBeTruthy();

        scrollStripTo(6);

        expect(findingNote()).toBeNull();
        expect(pressGoNote()).toBeNull();
        expect(stripLine("Everytime You Go Away", "Paul Young")).toBeTruthy();
    });

    it("never shows up for a strip stop, even while its song loads", async () => {
        await showResult();
        const held = holdSongAnswers();

        scrollStripTo(6);
        await waitForStripToSettle();

        expect(held.asked).toEqual(["/api/song?date=1985-07-27&source=strip&mode=peek"]);
        expect(findingNote()).toBeNull();
        expect(stripLine("Everytime You Go Away", "Paul Young")).toBeTruthy();
    });

    it("says Finding for today when Go starts from the newest chart week, which is dated after today", async () => {
        const today = new Date();
        const isoDay = (daysFromToday: number) =>
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday).toLocaleDateString(
                "en-CA",
            );
        // chart weeks are dated ahead, so the newest one can be after today
        const server = fakeServer([
            ...WEEKS,
            { date: isoDay(-2), song: "This Week's Song", artist: "Now Playing" },
            { date: isoDay(5), song: "Next Week's Song", artist: "Coming Soon" },
        ]);
        global.fetch = jest.fn(server) as unknown as typeof fetch;
        await renderPage();
        pickDate("1999-06-14");
        go();
        await song("If You Had My Love");

        scrollStripTo(10);
        await waitForStripToSettle();
        expect(await song("Next Week's Song")).toBeTruthy();
        expect(pickerSays()).toEqual([today.getFullYear(), today.getMonth() + 1, today.getDate()].map(String));
        expect(pressGoNote()).toBeNull();

        const held = holdSongAnswers(server);
        go();
        await act(async () => {});

        const longToday = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        expect(statusNote(`Finding the #1 for ${longToday}…`)).toBeTruthy();
        expect(stripLine("Next Week's Song", "Coming Soon")).toBeNull();

        await act(async () => held.release());
        expect(await song("This Week's Song")).toBeTruthy();
        await waitFor(() => expect(stripLine("This Week's Song", "Now Playing")).toBeTruthy());
        expect(findingNote()).toBeNull();
        expect(pressGoNote()).toBeNull();
    });

    it("on /17, says Finding on your 17th birthday while Go looks that up", async () => {
        await showResult(true);
        const held = holdSongAnswers();
        // turns 17 on June 14, 1999
        pickDate("1982-06-14");

        go();
        await act(async () => {});

        expect(statusNote("Finding the #1 on your 17th birthday…")).toBeTruthy();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();

        await act(async () => held.release());
        expect(await song("If You Had My Love")).toBeTruthy();
        await waitFor(() => expect(stripLine("If You Had My Love", "Jennifer Lopez")).toBeTruthy());
        expect(findingNote()).toBeNull();
    });

    it("on /17, says Finding for the birthday itself when its 17th is still to come", async () => {
        await showResult(true);
        holdSongAnswers();
        // turns 17 in 2032, so Go shows the birthday's own week
        pickDate("2015-06-14");

        go();
        await act(async () => {});

        expect(statusNote("Finding the #1 for June 14, 2015…")).toBeTruthy();
    });

    it("on /17, says Finding while the switch looks up a song, and nothing when it shows a saved one", async () => {
        await showResult(true);
        const held = holdSongAnswers();

        fireEvent.click(screen.getByRole("button", { name: "Back to the day you were born" }));
        await act(async () => {});

        expect(statusNote("Finding the #1 for July 15, 1968…")).toBeTruthy();
        expect(stripLine("A View To A Kill", "Duran Duran")).toBeNull();

        await act(async () => held.release());
        expect(await song("This Guy's In Love With You")).toBeTruthy();
        await waitFor(() => expect(stripLine("This Guy's In Love With You", "Herb Alpert")).toBeTruthy());

        // the 17th birthday's song is saved, so it comes straight back
        fireEvent.click(screen.getByRole("button", { name: "Your 17th birthday #1" }));

        expect(findingNote()).toBeNull();
        expect(held.asked).toHaveLength(1);
        expect(await song("A View To A Kill")).toBeTruthy();
        await waitFor(() => expect(stripLine("A View To A Kill", "Duran Duran")).toBeTruthy());
    });
});
