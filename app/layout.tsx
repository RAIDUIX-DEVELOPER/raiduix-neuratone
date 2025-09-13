import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import SpotlightProvider from "@/app/ui/SpotlightProvider";
import RouteLoadingOverlay from "@/app/ui/RouteLoadingOverlay";
import BreadcrumbsJsonLd from "./ui/BreadcrumbsJsonLd";
import AnalyticsEvents from "./ui/AnalyticsEvents";
import SiteHeader from "./ui/SiteHeader";
import ScrollToTopButton from "./ui/ScrollToTopButton";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "NeuraTone — Free Binaural & Isochronic Soundscapes (Sleep, Calm, Focus)",
  description:
    "Create calming, layered binaural & isochronic soundscapes in seconds. Free. No sign‑up.",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title:
      "NeuraTone — Free Binaural & Isochronic Soundscapes (Sleep, Calm, Focus)",
    description:
      "Create calming, layered binaural & isochronic soundscapes in seconds. Free. No sign‑up.",
    siteName: "NeuraTone",
    images: [
      {
        url: "/image-og.jpg",
        width: 1200,
        height: 630,
        alt: "NeuraTone",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "NeuraTone — Free Binaural & Isochronic Soundscapes (Sleep, Calm, Focus)",
    description:
      "Create calming, layered binaural & isochronic soundscapes in seconds. Free. No sign‑up.",
    images: [
      {
        url: "/image-og.jpg",
        alt: "NeuraTone",
      },
    ],
    creator: "@neuratone",
    site: "@neuratone",
  },
  icons: {
    other: [{ rel: "mask-icon", url: "/favicon.ico" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnects for performance */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://x.com" />
        <link rel="preconnect" href="https://github.com" />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased min-h-dvh`}
      >
        {/* Breadcrumbs JSON-LD (dynamic) */}
        <BreadcrumbsJsonLd />
        <SpotlightProvider />
        <RouteLoadingOverlay />
        {/* Global delegated analytics for click events */}
        <AnalyticsEvents />
        <SiteHeader />
        {children}
        <ScrollToTopButton />
        <Analytics />
      </body>
    </html>
  );
}
