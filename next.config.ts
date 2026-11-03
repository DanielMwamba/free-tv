import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Lecteurs officiels autorisés dans l'iframe du lecteur.
const EMBED_ORIGINS = [
  "https://www.youtube.com",
  "https://geo.dailymotion.com",
  "https://player.twitch.tv",
];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injecte des scripts inline d'hydratation ; le mode dev a aussi besoin d'eval.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // Les flux passent par /api/stream ; hls.js utilise des blobs pour MSE et son worker.
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  `frame-src ${EMBED_ORIGINS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
