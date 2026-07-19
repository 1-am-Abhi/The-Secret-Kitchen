import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Crawler rules.
 *
 * Everything customer-facing is open. Personalised and operational routes are
 * blocked — they carry no search value and admin must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/cart", "/checkout", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
