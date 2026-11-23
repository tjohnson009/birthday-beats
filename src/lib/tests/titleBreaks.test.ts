import cassette from "../../app/api/share-image/cards/cassette";
import nowPlaying from "../../app/api/share-image/cards/nowPlaying";
import player from "../../app/api/share-image/cards/player";
import record from "../../app/api/share-image/cards/record";
import { keepsParts, keptSplit } from "../../app/api/share-image/cards/shared";
import type { StoryCardDesign } from "../../app/api/share-image/cards/types";
import { shareCard } from "../shareCard";

const words = (title: string): string[] => title.split(" ");
// one character is one unit wide, spaces included
const chars = (w: string[]) => (a: number, b: number) => w.slice(a, b).join(" ").length;

describe("keepsParts", () => {
    const escape = words("Escape (The Pina Colada Song)");

    it("lets a title break right before a part in parentheses", () => {
        expect(keepsParts(escape, [1], () => true)).toBe(true);
    });

    it("won't break inside a part that fits on a line of its own", () => {
        expect(keepsParts(escape, [3], () => true)).toBe(false);
        expect(keepsParts(escape, [1, 3], () => true)).toBe(false);
    });

    it("lets a part too long for one line wrap, but only once it starts a line", () => {
        expect(keepsParts(escape, [1, 3], () => false)).toBe(true);
        expect(keepsParts(escape, [3], () => false)).toBe(false);
    });

    it("gives a long part lines of its own, so the words after it start a new line", () => {
        const close = words("(They Long To Be) Close To You");
        expect(keepsParts(close, [3], () => false)).toBe(false);
        expect(keepsParts(close, [3, 4], () => false)).toBe(true);
    });

    it("keeps a quoted name whole inside a long part, with straight or curly quotes", () => {
        // a part of 4 words or fewer fits on a line
        const fits = (a: number, b: number) => b - a <= 4;
        for (const title of [
            'Evergreen (Love Theme From "A Star Is Born")',
            "Evergreen (Love Theme From “A Star Is Born”)",
        ]) {
            expect(keepsParts(words(title), [1, 4], fits)).toBe(true);
            expect(keepsParts(words(title), [1, 5], fits)).toBe(false);
            expect(keepsParts(words(title), [4], fits)).toBe(false);
        }
    });

    it("treats square brackets like parentheses", () => {
        const vault = words("Is It Over Now? (Taylor’s Version) [From The Vault]");
        expect(keepsParts(vault, [4, 6], () => true)).toBe(true);
        expect(keepsParts(vault, [4, 7], () => true)).toBe(false);
    });

    it("passes any break in a title with no parts", () => {
        expect(keepsParts(words("I Will Always Love You"), [2, 4], () => true)).toBe(true);
    });
});

describe("keptSplit", () => {
    it("takes an extra line rather than break inside a part, starting the long part on its own line", () => {
        const escape = words("Escape (The Pina Colada Song)");
        // "(The Pina Colada Song)" is 22 wide, too long for a line of 20
        expect(keptSplit(escape, 2, chars(escape), 20)).toBeNull();
        expect(keptSplit(escape, 3, chars(escape), 20)).toMatchObject({ cuts: [1, 3], n: 3 });
    });

    it("splits the rest of the title evenly when the part sets the widest line", () => {
        const hotstepper = words('Here Comes The Hotstepper (From "Ready To Wear")');
        expect(keptSplit(hotstepper, 3, chars(hotstepper), 22)).toMatchObject({ cuts: [2, 4], n: 3 });
    });

    it("counts a break right before a part or a quote as a good one", () => {
        const gangsta = words('Gangsta’s Paradise (From "Dangerous Minds")');
        const r = keptSplit(gangsta, 3, chars(gangsta), 20, () => 1);
        expect(r).toMatchObject({ cuts: [2, 3], n: 3, bad: 0 });
    });
});

// the title's lines as a card draws them: every drawn line is its own no-wrap box. quotes and apostrophes come back
// straight, so the checks read the same for every style
type El = { props?: { style?: { whiteSpace?: string }; children?: unknown } };
function drawnTitle(design: StoryCardDesign, week: string): string[] {
    const card = shareCard(week, week.slice(0, 4), "seventeen")!;
    const lines: { box: number; text: string }[] = [];
    let boxes = 0;
    const walk = (node: unknown, box: number) => {
        if (typeof node === "string" || typeof node === "number") {
            const last = lines[lines.length - 1];
            if (box && last?.box === box) last.text += " " + node;
            else lines.push({ box, text: String(node) });
        } else if (Array.isArray(node)) node.forEach((n) => walk(n, box));
        else if (node && typeof node === "object" && "props" in node) {
            const { style, children } = (node as El).props ?? {};
            walk(children, style?.whiteSpace === "nowrap" ? ++boxes : box);
        }
    };
    walk(design.draw(card, "blue"), 0);
    const plain = (s: string) => s.replace(/[“”]/g, '"').replace(/’/g, "'");
    const squash = (s: string) => plain(s).replace(/\s+/g, "").toLowerCase();
    const want = squash(card.title);
    for (let i = 0; i < lines.length; i++) {
        let run = "";
        for (let j = i; j < lines.length && want.startsWith(run); j++) {
            run += squash(lines[j].text);
            if (run === want) return lines.slice(i, j + 1).map((l) => plain(l.text).toLowerCase());
        }
    }
    throw new Error(`no title "${card.title}" in the picture`);
}

describe.each([
    ["Now playing", nowPlaying],
    ["Player", player],
    ["Record", record],
    ["Cassette", cassette],
])("the %s card's title lines", (_, design) => {
    it("break right before a part in parentheses, not inside it", () => {
        expect(drawnTitle(design, "1979-12-22")[0]).toBe("escape"); // Escape (The Pina Colada Song)
    });

    it("start a long part on its own line and keep the movie name in quotes whole", () => {
        // Evergreen (Love Theme From "A Star Is Born")
        const evergreen = drawnTitle(design, "1977-03-05");
        expect(evergreen[0]).toBe("evergreen");
        expect(evergreen.some((l) => l.includes('"a star is born"'))).toBe(true);
        // Glory Of Love (Theme From "The Karate Kid Part II")
        const glory = drawnTitle(design, "1986-08-02");
        expect(glory[0]).toBe("glory of love");
        expect(glory.some((l) => l.includes('"the karate kid part ii"'))).toBe(true);
    });

    it("keep a short part on one line", () => {
        // (They Long To Be) Close To You
        expect(drawnTitle(design, "1970-07-25").some((l) => l.startsWith("(they long to be)"))).toBe(true);
        // I Wanna Dance With Somebody (Who Loves Me)
        expect(drawnTitle(design, "1987-06-27").some((l) => l.endsWith("(who loves me)"))).toBe(true);
    });
});
