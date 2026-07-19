import type { Metadata } from "next";
import { fullAddress, siteConfig } from "@/config/site";

const OG_IMAGE = "/opengraph-image.png";

/**
 * Build page metadata from a few page-specific fields, inheriting brand
 * defaults (OG image, Twitter card, canonical base) so no page has to restate
 * boilerplate. Pass `path` to get a correct canonical URL.
 */
export function buildMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  image = OG_IMAGE,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = path === "/" ? title : `${title} | ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords],
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export const defaultKeywords = [
  "cloud kitchen",
  "tiffin service",
  "monthly tiffin",
  "veg food delivery",
  "homemade food",
  "north indian food",
  "healthy meals",
  "The Secret Kitchen",
  `tiffin service ${siteConfig.address.city}`,
  `food delivery ${siteConfig.address.city}`,
];

/* ==========================================================================
   JSON-LD structured data
   Emitted as <script type="application/ld+json"> so Google can render rich
   results (business card, star ratings, menu, FAQ accordion, breadcrumbs).
   ========================================================================== */

export function localBusinessSchema() {
  const { address, contact, hours, stats } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteConfig.url}/#restaurant`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: contact.phone,
    email: contact.email,
    image: `${siteConfig.url}${OG_IMAGE}`,
    priceRange: "₹₹",
    servesCuisine: ["North Indian", "South Indian", "Italian", "Chinese"],
    // Signals to Google that this kitchen is 100% vegetarian.
    hasMenu: `${siteConfig.url}/menu`,
    acceptsReservations: "False",
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.line1}, ${address.line2}`,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: address.latitude,
      longitude: address.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: hours.weekday.open,
        closes: hours.weekday.close,
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: hours.weekend.open,
        closes: hours.weekend.close,
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: stats.rating,
      reviewCount: stats.reviewCount,
      bestRating: 5,
    },
    sameAs: Object.values(siteConfig.social),
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    description: siteConfig.description,
    foundingDate: String(siteConfig.foundedYear),
    address: { "@type": "PostalAddress", streetAddress: fullAddress },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: Object.values(siteConfig.social),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteConfig.url,
    name: siteConfig.name,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/menu?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteConfig.url}${crumb.path}`,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
