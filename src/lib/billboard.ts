import numberOneSongs from "../../data/number-ones.json";

export const getNumberOneSongForDate = (date: string) => {
    const index = numberOneSongs.findIndex((song) => song.date > date);

    return index === -1 ? 
        numberOneSongs[numberOneSongs.length - 1]
        : index === 0 ? null
        : numberOneSongs[index - 1];
};
