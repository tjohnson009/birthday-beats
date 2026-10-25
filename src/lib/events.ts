import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
}

const sql = neon(databaseUrl);

export type Stats = {
    visits: number;
    beatsServed: number;
};

export const logVisit = async (): Promise<void> => {
    await sql`INSERT INTO events (type) VALUES ('visit')`;
};

export const logSearch = async (birthday: string, found: boolean): Promise<void> => {
    await sql`INSERT INTO events (type, birthday, found) VALUES ('search', ${birthday}, ${found})`;
};

export const getStats = async (): Promise<Stats> => {
    const rows = await sql`
        SELECT
            count(*) FILTER (WHERE type = 'visit') AS visits,
            count(*) FILTER (WHERE type = 'search' AND found) AS beats_served
        FROM events
    `;

    return {
        visits: Number(rows[0].visits),
        beatsServed: Number(rows[0].beats_served),
    };
};
