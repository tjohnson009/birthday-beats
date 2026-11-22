/**
 * @jest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
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
