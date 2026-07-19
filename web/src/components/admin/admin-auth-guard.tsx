"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { AdminSessionProvider } from "@/components/admin/admin-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { fetchCurrentAdmin, type AdminIdentity } from "@/lib/admin-auth";
import {
  ADMIN_LOGIN_PATH,
  clearAdminToken,
  getAdminToken,
  isAdminApiConfigured,
} from "@/lib/admin-orders";

/* ========================================================================== */
/*  Full-page states                                                          */
/* ========================================================================== */

/**
 * Deliberately not the dashboard skeleton: until the token is verified we must
 * show nothing that looks like admin data, or an unauthenticated visitor gets a
 * flash of the real layout before the redirect lands.
 */
function AdminAuthSplash({
  title,
  description,
  busy = true,
  children,
}: {
  title: string;
  description?: string;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-900 px-6 text-center">
      <LogoMark className="size-11" />
      <div className="flex items-center gap-2.5 text-white">
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <AlertTriangle className="size-4 text-amber-400" aria-hidden />
        )}
        <p role="status" className="text-sm font-medium">
          {title}
        </p>
      </div>
      {description && <p className="max-w-sm text-sm text-white/50">{description}</p>}
      {children}
    </div>
  );
}

/* ========================================================================== */
/*  Guard                                                                     */
/* ========================================================================== */

type GuardState = "checking" | "ready" | "redirecting" | "unreachable";

/**
 * Auth gate and chrome switch for everything under `/admin`.
 *
 * Why the login route is handled *here* rather than by its own layout: Next
 * layouts compose, they do not override — `app/admin/login/layout.tsx` would
 * still be rendered *inside* `app/admin/layout.tsx`, so a nested layout cannot
 * escape the parent's shell or this guard. Keeping both decisions in one
 * component means there is exactly one rule about what is public, instead of a
 * rule here and a silently ineffective one in a second file.
 *
 * On mount it reads the stored token and validates it against `GET /auth/me`:
 *
 *   no token / 401  ->  clear the token, replace with the login route
 *   valid           ->  publish the admin on context and render the shell
 *   unreachable     ->  say so, and offer retry — do NOT wipe a token that may
 *                       be perfectly valid just because the API is down
 */
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === ADMIN_LOGIN_PATH;

  const [state, setState] = React.useState<GuardState>("checking");
  const [session, setSession] = React.useState<AdminIdentity | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  // Read inside the effect so a retry or a later redirect uses the route the
  // operator is actually on, without re-validating on every navigation.
  const pathnameRef = React.useRef(pathname);
  pathnameRef.current = pathname;

  React.useEffect(() => {
    if (isLoginRoute) {
      // Sign-out lands here; drop any identity still held in memory.
      setSession(null);
      setState("checking");
      return;
    }

    const toLogin = () => {
      clearAdminToken();
      setSession(null);
      setState("redirecting");
      router.replace(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(pathnameRef.current)}`);
    };

    // No backend configured is a build-time fact, not a session problem: the
    // panel runs in its documented offline mode against bundled sample data,
    // and bouncing to a sign-in screen that cannot possibly work would just
    // trap the user. There is no real data to protect in this mode.
    if (!isAdminApiConfigured) {
      setSession(null);
      setState("ready");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      toLogin();
      return;
    }

    setState("checking");
    const controller = new AbortController();
    let active = true;

    void (async () => {
      const result = await fetchCurrentAdmin(token, controller.signal);
      if (!active) return;

      if (result.ok) {
        setSession(result.admin);
        setState("ready");
        return;
      }

      if (result.reason === "unauthorized") {
        toLogin();
        return;
      }

      setState("unreachable");
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [isLoginRoute, router, attempt]);

  // `/admin/login` renders its own minimal chrome — no sidebar, no top bar, no
  // session requirement.
  if (isLoginRoute) return <>{children}</>;

  if (state === "checking" || state === "redirecting") {
    return (
      <AdminAuthSplash
        title={state === "redirecting" ? "Redirecting to sign in…" : "Checking your session…"}
      />
    );
  }

  if (state === "unreachable") {
    return (
      <AdminAuthSplash
        busy={false}
        title="Cannot verify your session"
        description="The admin API did not respond. Your sign-in has been kept — try again once the connection is back."
      >
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => {
              clearAdminToken();
              router.replace(ADMIN_LOGIN_PATH);
            }}
          >
            Sign out
          </Button>
        </div>
      </AdminAuthSplash>
    );
  }

  return (
    <AdminSessionProvider admin={session}>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
