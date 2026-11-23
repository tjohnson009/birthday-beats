// titles the chart source spells wrong, keyed by "title|artist" exactly as the source has them. the weekly
// rebuild applies these, so a fix here survives every refresh
const TITLE_FIXES: Record<string, string> = {
    'Kokomo (From"Cocktail" )|The Beach Boys': 'Kokomo (From "Cocktail")',
};

export const fixTitle = (song: string, artist: string) => TITLE_FIXES[`${song}|${artist}`] ?? song;
