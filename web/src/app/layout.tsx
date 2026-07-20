import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";

import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import {
  buildMetadata,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";

import "./globals.css";

/* Display face for headings — loaded with `display: swap` so text paints
   immediately with the fallback rather than blocking first contentful paint. */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/* Body face. Only the weights actually used are requested, keeping the font
   payload small. */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  ...buildMetadata({
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: "/",
  }),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  manifest: "/manifest.webmanifest",
  category: "food",
  formatDetection: { telephone: true, address: true, email: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${poppins.variable}`}>
      <head>
        {/* Warm up the image CDN connection before the hero image is requested. */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/*
          Scroll-reveal elements render at opacity 0 and are animated in by
          Framer Motion. With JavaScript disabled that animation never runs, so
          the page would appear blank. Force them visible instead — the content
          matters far more than the entrance.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* Keyboard users can jump straight past the navbar. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand-500 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lift"
        >
          Skip to main content
        </a>

        {/*
          Horizontal overflow is clipped HERE rather than on html or body.

          Entrance animations translate elements in from ±32px, which on a
          narrow screen briefly pushes content past the viewport. Clipping is
          the cure, but where it is applied matters enormously: with the clip on
          html, Radix resolved every popover against the wrong box once the page
          was scrolled, and the admin account menu opened ~700px above a 900px
          viewport — open and correct in the DOM, but nowhere a person could
          click it.

          Radix portals mount onto body, so this wrapper sits inside the clip
          while every dropdown, dialog and tooltip sits outside it. Both
          problems are solved without either fighting the other.

          `clip` not `hidden`: hidden makes this a scroll container and silently
          breaks `position: sticky` on the navbar and the menu filter bar.
        */}
        <div className="overflow-x-clip">{children}</div>

        <JsonLd data={[organizationSchema(), localBusinessSchema(), websiteSchema()]} />
      </body>
    </html>
  );
}
