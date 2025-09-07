declare module "next-pwa" {
  import type { NextConfig } from "next";
  interface PWAOptions {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    fallbacks?: Record<string, string>;
  }
  export default function withPWA(
    options?: PWAOptions
  ): (config: NextConfig) => NextConfig;
}
