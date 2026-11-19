import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Every page in this app is behind a login and shows live data, so we use the
  // standard dynamic rendering model instead of Cache Components.
  cacheComponents: false,
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Revisiting a page within 30s is instant (served from the browser's router cache).
    // Saving anything clears this cache for the person who saved, so they always see their change.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: {
      bodySizeLimit: "2mb", // student photo uploads (resized in the browser first)
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
