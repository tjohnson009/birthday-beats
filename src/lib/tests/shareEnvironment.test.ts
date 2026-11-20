import { shareScreen } from "../shareEnvironment";

// real user agents, trimmed to the parts that matter
const UA = {
    iphoneInstagram:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 356.0.0.32.111 (iPhone15,3; iOS 18_1; en_US; en; scale=3.00; 1290x2796; 654891233)",
    ipadInstagram:
        "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F79 Instagram 340.0.0.22.109 (iPad13,1; iPadOS 17_5; en_US; en; scale=2.00; 820x1180; 624232340)",
    iphoneSafari:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    iphoneChrome:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
    iphoneFacebook:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/490.0.0.56.109;FBBV/654891233;FBDV/iPhone15,3]",
    macSafari:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    androidInstagram:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 343.0.0.38.94 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 630156200)",
    androidChrome:
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    samsungInternet:
        "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
    windowsChrome:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

describe("shareScreen", () => {
    it("picks screen A for Instagram's browser on an iPhone or iPad", () => {
        expect(shareScreen({ userAgent: UA.iphoneInstagram })).toBe("iphone-instagram");
        expect(shareScreen({ userAgent: UA.ipadInstagram })).toBe("iphone-instagram");
    });

    it("picks screen B for every other iPhone browser, Facebook's included", () => {
        expect(shareScreen({ userAgent: UA.iphoneSafari })).toBe("iphone");
        expect(shareScreen({ userAgent: UA.iphoneChrome })).toBe("iphone");
        expect(shareScreen({ userAgent: UA.iphoneFacebook })).toBe("iphone");
    });

    it("counts an iPad asking for the desktop site as an iPhone, by its touch screen", () => {
        expect(shareScreen({ userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 5 })).toBe("iphone");
    });

    it("picks screen C for Instagram's browser on Android", () => {
        expect(shareScreen({ userAgent: UA.androidInstagram })).toBe("android-instagram");
    });

    it("picks screen D for other Android browsers", () => {
        expect(shareScreen({ userAgent: UA.androidChrome })).toBe("android");
        expect(shareScreen({ userAgent: UA.samsungInternet })).toBe("android");
    });

    it("picks screen E for computers, a real Mac included", () => {
        expect(shareScreen({ userAgent: UA.windowsChrome })).toBe("computer");
        expect(shareScreen({ userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 0 })).toBe("computer");
        expect(shareScreen({ userAgent: UA.macSafari })).toBe("computer");
        expect(shareScreen({ userAgent: "" })).toBe("computer");
    });

    it("matches Instagram as a whole word only", () => {
        expect(shareScreen({ userAgent: UA.iphoneSafari + " Instagrammer/1.0" })).toBe("iphone");
        expect(shareScreen({ userAgent: UA.androidChrome + " instagram 300.0" })).toBe("android-instagram");
    });
});
