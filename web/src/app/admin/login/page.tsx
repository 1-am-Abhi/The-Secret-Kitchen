import * as React from "react";
import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";

/**
 * Sign-in for the operations console.
 *
 * The chrome is *not* the admin shell: `AdminAuthGuard` (wired in
 * `app/admin/layout.tsx`) renders this route's children bare, because a sidebar
 * full of section links is meaningless — and slightly misleading — to someone
 * who is not signed in yet. See the guard for why a nested `login/layout.tsx`
 * could not have done this on its own.
 *
 * The robots block repeats the parent layout's rather than relying on it: this
 * is the one admin URL that is genuinely reachable and linkable by anyone.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the internal operations console.",
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

export default function AdminLoginPage() {
  return (
    // `AdminLoginForm` reads the `?next=` parameter, which Next requires to sit
    // behind a Suspense boundary so the shell around it can still prerender.
    <React.Suspense fallback={<div className="min-h-dvh bg-ink-900" />}>
      <AdminLoginForm />
    </React.Suspense>
  );
}
