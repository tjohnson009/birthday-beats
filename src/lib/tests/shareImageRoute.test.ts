import { NextRequest } from "next/server";
import sharp from "sharp";
import { GET } from "@/app/api/share-image/route";
import { shareImagePath } from "@/lib/share";

// the share picture goes out as a JPEG: a PNG of the busier styles is over a megabyte, and Instagram turns
// Story pictures into JPEGs anyway

// next/og loads its renderer with a dynamic import, which jest can't run. this stand-in sends a plain PNG at the
// size the route asks for, with any headers it gives, like the real one, so the test covers what the route does
// with the picture
jest.mock("next/og", () => {
    const realSharp = jest.requireActual("sharp");
    return {
        ImageResponse: class extends Response {
            constructor(
                _element: unknown,
                { width, height, headers }: { width: number; height: number; headers?: Record<string, string> },
            ) {
                const png: Promise<Buffer> = realSharp({
                    create: { width, height, channels: 3, background: "#2f6bff" },
                })
                    .png()
                    .toBuffer();
                const body = new ReadableStream({
                    async start(controller) {
                        controller.enqueue(new Uint8Array(await png));
                        controller.close();
                    },
                });
                super(body, { headers: { "content-type": "image/png", ...headers } });
            }
        },
    };
});

const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

const get = (path: string) => GET(new NextRequest(`http://localhost${path}`));

// the headers, and the picture's first bytes, size, and color sampling
const sent = async (response: Response) => {
    const bytes = Buffer.from(await response.arrayBuffer());
    const { format, width, height, chromaSubsampling } = await sharp(bytes).metadata();
    return {
        status: response.status,
        type: response.headers.get("content-type"),
        cache: response.headers.get("cache-control"),
        start: bytes.subarray(0, 2).toString("hex"),
        picture: { format, width, height, chromaSubsampling },
    };
};

const FULL_SIZE_JPEG = {
    status: 200,
    type: "image/jpeg",
    cache: CACHE,
    // every JPEG starts with FF D8
    start: "ffd8",
    // full chroma, so small colored text keeps clean edges
    picture: { format: "jpeg", width: 1080, height: 1920, chromaSubsampling: "4:4:4" },
};

describe("share image route", () => {
    it.each(["now-playing", "player", "record", "cassette"] as const)(
        "sends the %s 17th birthday picture as a JPEG",
        async (style) => {
            const response = await get(shareImagePath("1991-07-27", "1991", "seventeen", { style, color: "ink" }));

            expect(await sent(response)).toEqual(FULL_SIZE_JPEG);
        },
    );

    it("sends the birthday picture as a JPEG", async () => {
        const response = await get(shareImagePath("1991-07-27", "1991", "born"));

        expect(await sent(response)).toEqual(FULL_SIZE_JPEG);
    });

    it("still turns away an address the site doesn't build", async () => {
        const response = await get("/api/share-image?week=1991-07-27&year=1991&kind=seventeen&style=record");

        expect(response.status).toBe(400);
        expect(response.headers.get("content-type")).toMatch(/application\/json/);
    });
});
