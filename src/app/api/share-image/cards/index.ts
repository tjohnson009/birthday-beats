import type { ShareStyle } from "@/lib/share";
import type { StoryCardDesign } from "./types";

// loaded when a picture in that style is asked for, so drawing one style never waits on the others' code
export const STORY_CARDS: Record<ShareStyle, () => Promise<{ default: StoryCardDesign }>> = {
    "now-playing": () => import("./nowPlaying"),
    player: () => import("./player"),
    record: () => import("./record"),
    cassette: () => import("./cassette"),
};
