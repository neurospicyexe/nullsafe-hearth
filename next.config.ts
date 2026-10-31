import type { NextConfig } from "next";

// Library uploads PUT the book straight to Halseth (lib/library-upload.ts), so the browser must be
// allowed to connect to that one origin. Build-time, same input as images.remotePatterns below.
const halsethOrigin = (() => {
  try { return process.env.HALSETH_URL ? new URL(process.env.HALSETH_URL).origin : null; }
  catch { return null; }
})();

const nextConfig: NextConfig = {
  // The old Today and Check-in pages live on Home now (spoons strip + check-in sheet).
  async redirects() {
    return [
      { source: "/today", destination: "/", permanent: false },
      { source: "/checkin", destination: "/", permanent: false },
      // Questions are one kind of "needs you" now.
      { source: "/questions", destination: "/needs", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",       value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // blob: is epub.js -- it unzips the book in-browser and serves every
              // internal image (and sometimes the chapter iframe itself) as a blob URL.
              // Without it the reader renders text but every illustration is blocked.
              "img-src 'self' data: blob: https:",
              "frame-src 'self' blob:",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com${halsethOrigin ? ` ${halsethOrigin}` : ""}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(process.env.HALSETH_URL ?? "https://localhost").hostname,
      },
    ],
  },
};

export default nextConfig;
