/**
 * @jest-environment jsdom
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import HeroTitles from "@/components/HeroTitles";

// the title wall stays on screen after a search. the result makes the page taller, so the wall keeps the
// height it had on the intro: the titles stay put instead of jumping down to the new middle

const TITLES = ["Hey Jude", "Hold On", "Vogue", "Smooth", "Hello"];

// jsdom has no ResizeObserver. this one lets a test say how tall the wall is, and goes quiet once
// disconnected, like the real one
let resize: (height: number) => void;
class FakeResizeObserver {
    private observing = false;
    constructor(callback: ResizeObserverCallback) {
        resize = (height) => {
            if (this.observing)
                callback([{ contentRect: { height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
        };
    }
    observe() {
        this.observing = true;
    }
    unobserve() {
        this.observing = false;
    }
    disconnect() {
        this.observing = false;
    }
}

beforeEach(() => {
    resize = () => {};
    global.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

// the box the title rows are centered in: a title's row, then the row's parent
const rowsBox = () => screen.getAllByText("Hey Jude")[0].parentElement!.parentElement!;

test("before a search, the wall follows the page's height", () => {
    render(<HeroTitles titles={TITLES} searched={false} />);
    act(() => resize(770));
    act(() => resize(820));

    expect(rowsBox().style.height).toBe("");
});

test("after a search, the wall keeps its intro height while the result grows the page", () => {
    const { rerender } = render(<HeroTitles titles={TITLES} searched={false} />);
    act(() => resize(770));

    rerender(<HeroTitles titles={TITLES} searched />);
    act(() => resize(1338));

    expect(rowsBox().style.height).toBe("770px");
});

test("the latest intro height is the one kept", () => {
    const { rerender } = render(<HeroTitles titles={TITLES} searched={false} />);
    act(() => resize(770));
    act(() => resize(640)); // the window got shorter before Go

    rerender(<HeroTitles titles={TITLES} searched />);

    expect(rowsBox().style.height).toBe("640px");
});

// a shared link skips the intro, and below lg the wall isn't drawn, so it measures 0
test("a search before the wall had a height leaves it following the page", () => {
    const { rerender } = render(<HeroTitles titles={TITLES} searched={false} />);
    act(() => resize(0));

    rerender(<HeroTitles titles={TITLES} searched />);

    expect(rowsBox().style.height).toBe("");
});
