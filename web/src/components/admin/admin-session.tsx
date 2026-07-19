"use client";

import * as React from "react";

import type { AdminIdentity } from "@/lib/admin-auth";

/**
 * The verified admin for the current session.
 *
 * Its own module rather than living in the guard: the guard renders the shell,
 * and the shell reads the session, so putting the context in either of them
 * would make those two files import each other in a cycle.
 *
 * `null` means "no verified session" — which is a real, non-error state when
 * the panel is running without a configured API (see `AdminAuthGuard`), so
 * consumers must degrade rather than assert.
 */
const AdminSessionContext = React.createContext<AdminIdentity | null>(null);

export function AdminSessionProvider({
  admin,
  children,
}: {
  admin: AdminIdentity | null;
  children: React.ReactNode;
}) {
  return <AdminSessionContext.Provider value={admin}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminIdentity | null {
  return React.useContext(AdminSessionContext);
}
