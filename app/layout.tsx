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
import React from "react";

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
  // NOTE: Keyword list intentionally pruned – removed unrelated / low-relevance phrases
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
    // Added extended meditation-related keywords (requested)
    "mindfulness meditation benefits",
    "meditation tips",
    "meditation monkey",
    "what does meditation do",
    "definition of meditation",
    "meditation exercises",
    "guided mindfulness meditation",
    "冥想 英文",
    "meditation guide",
    "rainbow meditation",
    "meditation synonyms",
    "meditation 意味",
    "huma meditation",
    "music to relax",
    "meditation for mental health",
    "meditation video",
    "meditation techniques for",
    "geführte meditation",
    "mindfulness and meditation",
    "best meditation guide for beginners",
    "meditation practices",
    "what are the benefits of meditation",
    "bubble meditation",
    "冥想英文",
    "headspace meditation",
    "define meditation",
    "meditation timer",
    "meditatio",
    "meditieren",
    "calm meditation",
    "gratitude meditation",
    "elders meditation",
    "meditation near me",
    "meditation practice",
    "meditation music for healing and relaxation",
    "meditation app",
    "deepak chopra meditation",
    "meditation song",
    "boho meditation youtube",
    "trataka meditation",
    "kadampa meditation centre",
    "benefits of mindfulness meditation",
    "relaxing meditation music",
    "meditation cedric michel",
    "daily meditation",
    "meditation classes near me",
    "chakra meditation",
    "heartfulness meditation",
    "benefits of meditation for mental health",
    "christian meditation",
    "spirit rock meditation center",
    "kadampa meditation center",
    "jft na meditation",
    "meditation moments",
    "meditation videos",
    "types of meditation",
    "buddhist meditation",
    "kids meditation",
    "mindful meditation",
    "méditation",
    "meditation music calm",
    "walking meditation",
    "jft meditation",
    "zen meditation",
    "na just for today meditation",
    "metta meditation",
    "guided meditation youtube",
    "meditation images",
    "meditation apps",
    "méditation pleine conscience",
    "meditation meaning",
    "meditation definition",
    "morning meditation",
    "youtube meditation",
    "youtube relax music",
    "meditar",
    "meditation music for kids",
    "loving kindness meditation",
    "meditating",
    "meditation youtube",
    "how to meditate properly",
    "meditation music relaxation",
    "what is meditation",
    "meditation for sleep",
    "vipassana meditation centre",
    "body scan meditation",
    "guided meditation benefit",
    "meditation techniques for beginners",
    "meditations",
    "how to meditate effectively",
    "mindfulness meditation guide",
    "meditacion",
    "meditation benefits",
    "sleep meditation",
    "meditation techniques",
    "just for today daily meditation",
    "meditation for kids",
    "youtube meditation music",
    "meditation for beginners",
    "tips for mindful meditation at home",
    "best ways to meditate daily",
    "easy ways to meditate",
    "simple meditation techniques",
    "how to meditate at home effectively",
    "mindfulness meditation",
    // trimmed repetitive long-tail mindfulness / meditation variants
    "transcendental meditation",
    "meditate",
    "how to meditate",
    "how to meditate for beginners",
    "relaxation",
    "yoga and meditation benefits",
    "youtube relaxing music",
    "relaxation music",
    "spa music",
    "guided meditation",
    "relax music",
    "meditation für anfänger",
    "instrumental music",
    "meditation music",
    "calm music",
    "mindfulness meditation practices",
    "benefits of meditation",
    "relax",
    "mediation",
    "calming music",
    "mindfulness meditation techniques",
    "relaxing music",
    "mindfulness practices benefits",
    "simple meditation practices",
    "meditation benefits for athletes",
    "meditation techniques for focus",
    "meditation practices for focus",
    "guided meditation benefits",
    // Extended frequency-related keywords (requested)
    "what is the unit of frequency",
    "frequency waves",
    "si unit of frequency",
    "unit for frequency",
    "fundamental frequency vibration",
    "meaning of frequency",
    "frequency definition physics",
    "formula of frequency",
    "equation for frequency",
    "frequency words",
    "frequencies movie",
    "frequ",
    "symbol for frequency",
    "rsv vaccine frequency",
    "frequency vs relative frequency",
    "relative frequency calculator",
    "wave frequency",
    "what is a frequency",
    "what is frequency in waves",
    "hz frequency",
    "frequency 読み方",
    "frequency diagram",
    "love frequency",
    "wavelength vs frequency",
    "what is the frequency of a wave",
    "frequency of a wave",
    "frequency unit",
    "wavelength and frequency",
    "relative frequency histogram",
    "frequency electronics",
    "frequency polygons",
    "definition of frequency",
    "cumulative frequency formula",
    "relative frequency distribution",
    "unit of frequency",
    "formula for frequency",
    "how to find frequency",
    "frequency翻译",
    "cologuard frequency",
    "frequency density",
    "dram frequency",
    "frequency domain",
    "sound frequency",
    "频率 英文",
    "frequency tables",
    "excel frequency",
    "frequency band",
    "healing frequency",
    "frequency excel",
    "frequency units",
    "cumulative relative frequency",
    "threshold frequency",
    "relative frequency table",
    "jacking off frequency",
    "what is the frequency",
    "urination frequency",
    "how to find cumulative frequency",
    "what does frequency mean",
    "what is cumulative frequency",
    "how to calculate relative frequency",
    "frequency music",
    "cutoff frequency",
    "natural frequency formula",
    "frequency analysis",
    "shure frequency finder",
    "frequency counter",
    "fundamental frequency",
    "prolia injection frequency",
    "frequency calculator",
    "angular frequency formula",
    "frequency histogram",
    "allele frequency",
    "radio frequency ablation",
    "how to calculate frequency",
    "frequency equation",
    "wordwall adverbs of frequency",
    "wavelength to frequency",
    "frequency spectrum",
    "频率的英文",
    "adverbs of frequency exercises",
    "frequency chart",
    "what's the frequency kenneth",
    "uhf frequency range",
    "frequency density formula",
    "radio frequency identification",
    "relative frequency formula",
    "frequency to wavelength",
    "high frequency trading",
    "frequency response",
    "resonance frequency",
    "what is relative frequency",
    "define frequency",
    "frequency bands",
    "frequency modulation",
    "how to find relative frequency",
    "natural frequency",
    "frequency symbol",
    "frequency synonym",
    "cumulative frequency graph",
    "frequency函数",
    "frequency of micturition",
    "resonant frequency",
    "adverbs of frequency wordwall",
    "killer frequency",
    "angular frequency",
    "frequency movie",
    "frequency 意味",
    "frequency converter",
    "adverb of frequency",
    "frequency definition",
    "high frequency",
    "frequency distribution table",
    "nyquist frequency",
    "urinary frequency",
    "time period",
    "frequencies",
    "frequence",
    "频率英文",
    "frequency adverbs",
    "frequency distribution",
    "what is frequency",
    "variable frequency drive",
    "freq",
    "frequency meaning",
    "frequency polygon",
    "cumulative frequency",
    "frequency formula",
    // Removed: "electric love", "adjust email sync frequency settings windows" (irrelevant)
    "relative frequency",
    "radio frequency",
    "frequency generator",
    "frequency table",
    "adverbs of frequency",
    "frequently",
    // Meditation app-related keywords (requested)

    "best apps for meditation",
    "meditation apps free",
    "calm meditation",
    "best apps for mindfulness and meditation",
    "free meditation apps",
    "calm sleep",
    "calm app free",
    "daily calm",
    "mindfulness apps",
    "meditation apps for stress relief",
    "mindfulness app",
    "best meditation apps",
    "meditation apps",
    // removed redundant Calm brand variants (keep single 'calm')
    "headspace app",
    "best free mindfulness apps",
    "best meditation apps free",
    "best meditation apps for beginners",
    "mindfulness apps for stress relief",
    "calm app",
    "relax",
    "digitale entspannungstechniken",
    "headspace",
    "calm",
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
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="skip-link sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
        >
          Skip to main content
        </a>
        {/* Breadcrumbs JSON-LD (dynamic) */}
        <BreadcrumbsJsonLd />
        <SpotlightProvider />
        <RouteLoadingOverlay />
        {/* Global delegated analytics for click events */}
        <AnalyticsEvents />
        {/* Disable right-click context menu globally */}
        <DisableContextMenu />
        <header role="banner">
          <SiteHeader />
        </header>
        <main id="main-content" role="main">
          {children}
        </main>
        <ScrollToTopButton />
        <Analytics />
      </body>
    </html>
  );
}
