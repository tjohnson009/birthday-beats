import fs from "node:fs"; 

type ChartEntry = {
    song: string;
    artist: string;
    this_week: number;
};

type ChartWeek = {
    date: string;
    data: ChartEntry[];
};

export const getBillboardData = async () => {
    const response = await fetch("https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/all.json");

    if (!response.ok) {
        throw new Error("Failed to fetch billboard data");
    }

    const data = (await response.json()) as ChartWeek[];
    return data;
};

export const extractNumberOneSongs = (charts: ChartWeek[]) => {
    const numberOneSongs = charts.map((weekOfData: ChartWeek) => {
        const topSong = weekOfData.data.find((entry) => entry.this_week === 1);

        if (!topSong) {
            throw new Error(`No #1 song found for chart week ${weekOfData.date}`);
        }

        return {
            date: weekOfData.date,
            song: topSong.song,
            artist: topSong.artist,
        };
    });

    return numberOneSongs;
};

const charts = await getBillboardData(); 
const numberOnes = extractNumberOneSongs(charts); 
fs.writeFileSync("data/number-ones.json", JSON.stringify(numberOnes, null, 2));
console.log(numberOnes.length);
