/**
 * @jest-environment jsdom
 */
import { copyText } from "../copyText";

const LINK = "https://birthdaybeats.net/17";

const linkField = () => {
    const field = document.createElement("input");
    field.value = LINK;
    document.body.append(field);
    return field;
};

const setClipboard = (clipboard: unknown) =>
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });

const setExecCommand = (execCommand: unknown) =>
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });

describe("copyText", () => {
    afterEach(() => {
        setClipboard(undefined);
        setExecCommand(undefined);
        document.body.innerHTML = "";
    });

    it("uses the clipboard when there is one", async () => {
        const writeText = jest.fn(async () => {});
        setClipboard({ writeText });

        expect(await copyText(LINK, linkField())).toBe(true);
        expect(writeText).toHaveBeenCalledWith(LINK);
    });

    it("falls back to selecting the link and the old copy command, as in Instagram's browser", async () => {
        const execCommand = jest.fn(() => true);
        setExecCommand(execCommand);
        const field = linkField();

        expect(await copyText(LINK, field)).toBe(true);
        expect(execCommand).toHaveBeenCalledWith("copy");
        expect([field.selectionStart, field.selectionEnd]).toEqual([0, LINK.length]);
    });

    it("says it didn't copy when neither way works, leaving the link selected", async () => {
        setClipboard({ writeText: async () => Promise.reject(new Error("NotAllowedError")) });
        setExecCommand(() => false);
        const field = linkField();

        expect(await copyText(LINK, field)).toBe(false);
        expect([field.selectionStart, field.selectionEnd]).toEqual([0, LINK.length]);
    });

    it("says it didn't copy when the old copy command is missing or throws", async () => {
        expect(await copyText(LINK, linkField())).toBe(false);

        setExecCommand(() => {
            throw new Error("not supported");
        });
        expect(await copyText(LINK, linkField())).toBe(false);
    });
});
