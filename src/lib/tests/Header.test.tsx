/**
 * @jest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import type { NextRouter } from "next/router";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import Header from "@/components/Header";

// the header's link to the 17th birthday page, and how it marks that page as the one you're on.
// the path is faked because there's no Next.js router in a test

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));

const onPage = (path: string) => jest.mocked(usePathname).mockReturnValue(path);

afterEach(cleanup);

test("the header links to the 17th birthday page as Your 2027", () => {
    onPage("/");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Your 2027" }).getAttribute("href")).toBe("/17");
});

test("on the 17th birthday page, the link says it's the current page", () => {
    onPage("/17");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Your 2027" }).getAttribute("aria-current")).toBe("page");
});

test("on the home page, the link isn't marked as the current page", () => {
    onPage("/");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Your 2027" }).hasAttribute("aria-current")).toBe(false);
});

// with a router in place, next/link turns a click into a page change that keeps what's on screen. under Jest,
// next/link is the pages-router build, so that's the router faked here
const push = jest.fn(async () => true);
const fakeRouter = {
    push,
    replace: jest.fn(async () => true),
    prefetch: jest.fn(async () => {}),
    pathname: "/",
    asPath: "/",
    query: {},
    isFallback: false,
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
};
const renderWithRouter = () =>
    render(
        <RouterContext.Provider value={fakeRouter as unknown as NextRouter}>
            <Header />
        </RouterContext.Provider>,
    );

test("from another page, the link goes to the 17th birthday page without a full page load", () => {
    onPage("/");
    push.mockClear();
    renderWithRouter();

    expect(fireEvent.click(screen.getByRole("link", { name: "Your 2027" }))).toBe(false);
    expect(push).toHaveBeenCalledWith("/17", expect.anything());
});

test("on the 17th birthday page, the link loads the page fresh, like the logo, instead of keeping the result", () => {
    onPage("/17");
    push.mockClear();
    renderWithRouter();
    // jsdom can't load pages and says so on the console
    const quiet = jest.spyOn(console, "error").mockImplementation(() => {});

    // nothing cancels the click, so the browser does a full page load
    expect(fireEvent.click(screen.getByRole("link", { name: "Your 2027" }))).toBe(true);
    expect(push).not.toHaveBeenCalled();
    quiet.mockRestore();
});
