import BirthdayBeats from "@/components/BirthdayBeats";
import { getHeroTitles } from "@/lib/showcase";

// a server component, so the title wall is picked from the chart data here
// and only the picks (not the whole chart file) are sent to the browser
export default function Home() {
    return <BirthdayBeats heroTitles={getHeroTitles(60)} />;
}
