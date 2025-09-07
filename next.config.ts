import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "tone",
      "howler",
      "zustand",
      "framer-motion",
      "lucide-react",
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline.html",
  },
})(nextConfig);
