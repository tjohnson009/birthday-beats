// copies text and says whether it worked. in-app browsers (Instagram's) may have no clipboard API, so this
// falls back to selecting the text in a field and the older copy command. a false result means the
// person has to copy by hand; the text is left selected for them
export const copyText = async (text: string, field: HTMLInputElement | null): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        if (!field) return false;
        field.focus();
        field.select();
        field.setSelectionRange(0, text.length); // iOS ignores select() alone
        try {
            return document.execCommand("copy");
        } catch {
            return false;
        }
    }
};
