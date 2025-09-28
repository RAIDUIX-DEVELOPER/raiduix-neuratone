import { NextResponse, type NextRequest } from "next/server";

// Security headers (CSP with nonce). We keep dev fallbacks and temporary 'unsafe-inline' for compatibility.
export function middleware(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";

  // Per-request nonce for CSP and for Next.js to auto-apply to its scripts/styles.
  // Generate cryptographically random 16-byte value and encode as hex to avoid Buffer/btoa.
  const arr = new Uint8Array(16);
  (globalThis.crypto as Crypto).getRandomValues(arr);
  const nonce = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const scriptSrc = [
    "'self'",
    // Allow Next.js to run framework/runtime scripts with nonce and strict-dynamic
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Temporary compatibility: inline allowed until all inline migrated to nonce
    "'unsafe-inline'",
    // Dev-only eval for React/Next dev tooling
    ...(isDev ? ["'unsafe-eval'"] : []),
    // Vercel analytics scripts
    "https://va.vercel-scripts.com",
  ].join(" ");

  const styleSrc = isDev
    ? [
        "'self'",
        // In dev, allow inline styles broadly and omit nonce so browsers don't ignore it
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ].join(" ")
    : [
        "'self'",
        // In prod, prefer nonced styles emitted by the framework/bundler
        `'nonce-${nonce}'`,
        "https://fonts.googleapis.com",
      ].join(" ");

  const directives: string[] = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    // Allow inline style attributes in dev for DX; browsers ignore generic 'unsafe-inline' when nonce present
    ...(isDev
      ? [
          "style-src-attr 'unsafe-inline'",
          "style-src-elem 'self' 'unsafe-inline'",
        ]
      : []),
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
    // Allow analytics and dev websockets
    "connect-src 'self' https: wss: ws: https://va.vercel-scripts.com",
    // Allow workers (incl. audio/worklets) from self and blob
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  const csp = directives.join("; ");

  // Pass nonce to the rendering pipeline and set headers on the response
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set(
    "Content-Security-Policy",
    csp.replace(/\s{2,}/g, " ").trim()
  );
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|manifest.json|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
