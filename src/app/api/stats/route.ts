import { NextResponse } from "next/server";
import { logVisit, getStats } from "@/lib/events";

export async function GET() {
    try {
        await logVisit();
        const stats = await getStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error("Stats failed: ", error);
        return NextResponse.json({ message: "Stats unavailable." }, { status: 503 });
    }
}
