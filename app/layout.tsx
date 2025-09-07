import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import SpotlightProvider from "@/app/ui/SpotlightProvider";

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

export const metadata: Metadata = {
  title: "NeuraToneᴿᴬᴵᴰᵁᴵˣ",
  description: "Layer Your Mind With Sound.",
  manifest: "/manifest.json",
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
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased min-h-dvh`}
      >
        <SpotlightProvider />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
