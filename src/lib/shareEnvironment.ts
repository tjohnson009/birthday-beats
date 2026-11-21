// which share screen fits where the person is. Instagram's own browser can't do what a real browser can
// (save pictures on Android, open the share menu), so each case gets its own steps
export type ShareScreen =
    | "iphone-instagram" // A: iPhone, inside Instagram
    | "iphone" // B: iPhone, Safari or any other browser
    | "android-instagram" // C: Android, inside Instagram
    | "android" // D: Android, Chrome or Samsung Internet
    | "computer"; // E: everything else

export type Device = {
    userAgent: string;
    platform?: string;
    maxTouchPoints?: number;
};

export const shareScreen = ({ userAgent, platform, maxTouchPoints = 0 }: Device): ShareScreen => {
    // test the token itself: a library's general "in-app" check broke in Aug 2025
    const inInstagram = /\bInstagram\b/i.test(userAgent);
    // an iPad asking for the desktop site says it's a Mac, but a Mac has no touch screen
    const isIPhone = /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
    const isAndroid = /Android/i.test(userAgent);

    if (isIPhone) return inInstagram ? "iphone-instagram" : "iphone";
    if (isAndroid) return inInstagram ? "android-instagram" : "android";
    return "computer";
};
