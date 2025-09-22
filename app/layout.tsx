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
import DisableContextMenu from "./ui/DisableContextMenu";

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

function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl;
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "NeuraTone: Free Binaural & Isochronic Soundscapes for Sleep, Calm, Focus",
  description:
    "Free open‑source tool to create layered binaural and isochronic soundscapes for sleep, calm, and focus. No sign‑up required.",
  keywords: [
    "binaural beats",
    "isochronic tones",
    "brainwave entrainment",
    "focus music",
    "sleep sounds",
    "calm",
    "study",
    "white noise",
    "pink noise",
    "brown noise",
    "audio effects",
    "reverb",
    "chorus",
    "phaser",
    "flanger",
    "compressor",
    "spatial audio",
    "sound design",
    "neuratone",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title:
      "NeuraTone: Free Binaural & Isochronic Soundscapes for Sleep, Calm, Focus",
    description:
      "Free open‑source tool to create layered binaural and isochronic soundscapes for sleep, calm, and focus. No sign‑up required.",
    siteName: "NeuraTone",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "NeuraTone",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "NeuraTone: Free Binaural & Isochronic Soundscapes for Sleep, Calm, Focus",
    description:
      "Free open‑source tool to create layered binaural and isochronic soundscapes for sleep, calm, and focus. No sign‑up required.",
    images: [
      {
        url: "/og-image.jpg",
        alt: "NeuraTone",
      },
    ],
    creator: "@neuratone",
    site: "@neuratone",
  },
  icons: {
    other: [{ rel: "mask-icon", url: "/favicon.ico" }],
  },
  verification: {
    google: "sxwVueaYMYESOpHLJg3aqdOZV6ZcK0Y73A1nJOt1GZA",
    other: {
      "msvalidate.01": "B568D8FCC6B3E52FA9F170A74E8C3B1F",
    },
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
        {/* Disable right-click context menu globally */}
        <DisableContextMenu />
        <SiteHeader />
        {children}
        <ScrollToTopButton />
        <Analytics />
      </body>
    </html>
  );
}
