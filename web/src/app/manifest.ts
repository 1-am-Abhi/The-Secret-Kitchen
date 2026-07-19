import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** PWA manifest — enables "Add to Home Screen" on mobile with brand chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff6b00",
    orientation: "portrait",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      // Served by src/app/icon.tsx — the route has no file extension.
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
