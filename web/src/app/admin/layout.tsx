import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { siteConfig } from "@/config/site";

/**
 * The admin panel deliberately does NOT reuse the storefront chrome — it has
 * its own dark sidebar, top bar and content column.
 *
 * The robots block is the important line here: an indexed admin surface leaks
 * operational data and outranks nothing useful, so it is excluded from every
 * crawler including the archive and snippet variants.
 */
export const metadata: Metadata = {
  title: {
    default: `Admin · ${siteConfig.name}`,
    template: `%s · Admin · ${siteConfig.shortName}`,
  },
  description: "Internal operations console. Not for public access.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-image-preview": "none",
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
