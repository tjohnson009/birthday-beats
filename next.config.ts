import os from "node:os";
import type { NextConfig } from "next";

// this machine's own network addresses, so a phone on the same wifi can test the dev server. Next.js 16
// blocks dev scripts for any other origin, which leaves the page un-hydrated (date picker greyed out).
// DEV_ORIGINS adds more, e.g. DEV_ORIGINS=my-tunnel.example.com npm run dev
const networkAddresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4")
    .map((address) => address!.address);

const nextConfig: NextConfig = {
    devIndicators: false,
    allowedDevOrigins: [...networkAddresses, "*.local", ...(process.env.DEV_ORIGINS?.split(",") ?? [])],
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    // no one else can put the site in a frame
                    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
                ],
            },
        ];
    },
};

export default nextConfig;
