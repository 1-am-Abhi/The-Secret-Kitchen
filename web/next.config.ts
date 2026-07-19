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
    // Modern formats first — AVIF typically saves 30-50% over JPEG at the same
    // perceptual quality, with WebP as the fallback for older browsers.
    formats: ["image/avif", "image/webp"],
    // Food photography is swapped from the seed CDN to Cloudinary once real
    // shots exist; both hosts stay allow-listed so the switch is a data-only
    // change (see src/config/images.ts).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    deviceSizes: [360, 420, 640, 828, 1080, 1200, 1600, 1920, 2048],
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
