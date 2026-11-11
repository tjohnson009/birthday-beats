import numberOneSongs from "../../../../data/number-ones.json";
import { buildStripData } from "@/lib/chartStrip";

// built once per deploy (the weekly chart refresh redeploys), so the strip's data is a static file
export const dynamic = "force-static";

export function GET() {
    return Response.json(buildStripData(numberOneSongs));
}
