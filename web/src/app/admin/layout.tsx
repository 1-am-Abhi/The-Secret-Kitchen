import type { Metadata } from "next";

import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
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

/**
 * Every admin route is gated here, so a new page under `/admin` is protected by
 * existing rather than by remembering to add a guard.
 *
 * `AdminAuthGuard` owns the chrome as well as the check: it renders the shell
 * once a session is verified, and renders `/admin/login` bare. That pairing has
 * to live in one client component — a layout is a server component and cannot
 * read the pathname, and a nested `login/layout.tsx` composes *inside* this one
 * rather than replacing it, so it could not have opted out of the shell.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
