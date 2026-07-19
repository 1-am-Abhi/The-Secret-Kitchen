import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { categories } from "@/data/menu";

/**
 * XML sitemap.
 *
 * Priorities reflect commercial value rather than site structure: the menu and
 * tiffin pages earn the most revenue, so they rank above the brand pages.
 * Cart, checkout and admin are deliberately excluded — they are noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/menu", priority: 0.95, changeFrequency: "daily" },
    { path: "/tiffin", priority: 0.95, changeFrequency: "weekly" },
    { path: "/offers", priority: 0.85, changeFrequency: "daily" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/gallery", priority: 0.65, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
  ];

  // Category-filtered menu views are real landing pages for long-tail searches
  // such as "paneer delivery noida", so they belong in the sitemap.
  const categoryRoutes = categories.map((category) => ({
    url: `${siteConfig.url}/menu?category=${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteConfig.url}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...categoryRoutes,
  ];
}
