import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // If serving images from Blob via next/image, add your Blob store domain here, e.g.:
  // images: {
  //   remotePatterns: [
  //     { protocol: 'https', hostname: 'my-store-id.public.blob.vercel-storage.com', pathname: '/**' },
  //   ],
  // },
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
