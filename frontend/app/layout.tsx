import "@coinbase/onchainkit/styles.css";
import "./theme.css";
import type { Metadata, Viewport } from "next";
import { Outfit, Montserrat } from 'next/font/google';
import "./globals.css";
import { Providers } from "./providers";
import { headers } from "next/headers";

// const outfit = Outfit({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-outfit',
// });

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  return {
    title: "Klyra - Finance the ultimate way",
    description:
      "The ultimate Web3 mobile app that bridges traditional finance and crypto. Connect your banks, mobile money, credit cards, and crypto wallets in one secure place. Buy, sell, send crypto with bank-level security.",
    keywords: "Web3, crypto, DeFi, mobile money, banking, blockchain, wallet, fintech, cryptocurrency",
    authors: [{ name: "Klyra Team" }],
    creator: "Klyra",
    publisher: "Klyra",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "32x32" },
      ],
      apple: [
        { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
      ],
    },
    manifest: "/manifest.json",
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch Klyra`,
          action: {
            type: "launch_frame",
            name: "Klyra",
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
            splashBackgroundColor: "#6366f1",
          },
        },
      }),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie') ?? null;
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Klyra" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
      </head>
      <body className={`${montserrat.variable} font-sans bg-background antialiased`} suppressHydrationWarning={true}>
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}
