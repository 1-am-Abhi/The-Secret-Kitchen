import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Pin the workspace root. Without this Turbopack walks up the tree, finds an
  // unrelated lockfile in a parent directory and infers the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    // AVIF first (30-50% smaller than JPEG at equal quality), WebP as fallback.
    //
    // Measured, rather than assumed: the cold cost of an optimised image is
    // ~300-400ms, of which ~275ms is fetching the original from the upstream
    // CDN — the encode itself is minor, so dropping AVIF buys nothing. Warm
    // requests serve in ~2ms, and Vercel's edge cache holds them for the
    // minimumCacheTTL below, so only the first visitor to a size ever pays.
    formats: ["image/avif", "image/webp"],
    // Food photography is swapped from the seed CDN to Cloudinary once real
    // shots exist; both hosts stay allow-listed so the switch is a data-only
    // change (see src/config/images.ts).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // Each distinct width is a separate upstream fetch, encode and cache entry.
    // Trimmed to the breakpoints the layouts actually request via `sizes`, so
    // viewports share cache entries instead of each minting its own.
    deviceSizes: [420, 640, 828, 1080, 1600, 1920],
    imageSizes: [48, 64, 96, 128, 192, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    // Tree-shake barrel imports so a single icon import does not pull the whole
    // library into the client bundle.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
