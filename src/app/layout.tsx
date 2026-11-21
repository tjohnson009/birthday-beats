import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/share";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    // both domains serve the site; search engines are pointed at www.birthdaybeats.net
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/" },
    title: "Birthday Beats",
    description:
        "What was the #1 song in the US on the day you were born? What about the day you graduated college? Birthday Beats helps you remember, see, and hear the number 1 song from any date since August 1958",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col">
                <Header />
                {children}
                <Footer />
            </body>
        </html>
    );
}
