import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    devIndicators: false,
    // lets a phone on the same wifi test the dev server, e.g. DEV_ORIGINS=192.168.0.90 npm run dev.
    // Next.js 16 blocks dev scripts for other origins, which leaves the page un-hydrated (date picker greyed out)
    allowedDevOrigins: process.env.DEV_ORIGINS?.split(",") ?? [],
};

export default nextConfig;
