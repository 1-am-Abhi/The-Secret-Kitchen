"use client";

import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/admin/page-header";
import { useOrderNotifications } from "@/components/admin/order-notifications";
import { Button } from "@/components/ui/button";
import { isAdminApiConfigured } from "@/lib/admin-orders";

/**
 * Operator preferences and a read-out of how this panel is wired up.
 *
 * Deliberately narrow. Everything a customer sees — statistics, outlets,
 * delivery areas, reviews — is edited under Site Content and Outlets, and
 * duplicating any of it here would create two places to change one thing. What
 * belongs here is what is genuinely per-operator (the alerts on this device)
 * and what an operator needs when something looks wrong (what this browser is
 * actually talking to).
 */

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-ink-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-500">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  const tones = {
    good: "bg-green-50 text-green-700 ring-green-600/20",
    warn: "bg-amber-50 text-amber-700 ring-amber-600/20",
    bad: "bg-red-50 text-red-700 ring-red-600/20",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SettingsView() {
  const { muted, toggleMuted, soundBlocked, enableSound, desktopAlerts, requestDesktopAlerts, connection } =
    useOrderNotifications();

  /*
   * Mirrors the five states the notifications provider actually reports.
   * "polling" is deliberately a warning rather than a success: orders still
   * arrive, but on a timer instead of instantly, and an operator watching for
   * a rush deserves to know the difference.
   */
  const CONNECTION: Record<typeof connection, { tone: "good" | "warn" | "bad"; label: string }> = {
    live: { tone: "good", label: "Live" },
    connecting: { tone: "warn", label: "Connecting…" },
    reconnecting: { tone: "warn", label: "Reconnecting…" },
    polling: { tone: "warn", label: "Polling (not live)" },
    offline: { tone: "bad", label: "Offline" },
  };
  const { tone: connectionTone, label: connectionLabel } = CONNECTION[connection];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Alert preferences for this device, and what this panel is connected to."
      />

      <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink-900">New order alerts</h2>
        <p className="mt-1 text-sm text-ink-500">
          These are stored in this browser only. A different device, or a different operator on
          this device, keeps its own.
        </p>

        <div className="mt-3">
          <Row
            title="Alert sound"
            description={
              soundBlocked
                ? "This browser blocked audio until you interact with the page."
                : "Plays a short chime when an order arrives."
            }
            control={
              soundBlocked ? (
                <Button type="button" variant="outline" onClick={enableSound}>
                  Enable sound
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={toggleMuted}>
                  {muted ? "Unmute" : "Mute"}
                </Button>
              )
            }
          />

          <Row
            title="Desktop notifications"
            description="Shows a system notification when the panel is in a background tab."
            control={
              desktopAlerts === "granted" ? (
                <StatusPill tone="good">Enabled</StatusPill>
              ) : desktopAlerts === "denied" ? (
                <StatusPill tone="bad">Blocked in browser settings</StatusPill>
              ) : desktopAlerts === "unsupported" ? (
                <StatusPill tone="warn">Not supported here</StatusPill>
              ) : (
                <Button type="button" variant="outline" onClick={requestDesktopAlerts}>
                  Enable
                </Button>
              )
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink-900">Connection</h2>
        <p className="mt-1 text-sm text-ink-500">
          The first thing to check when the panel looks stale or empty.
        </p>

        <div className="mt-3">
          <Row
            title="Live order stream"
            description="A push connection to the API. When this drops, new orders stop appearing on their own."
            control={<StatusPill tone={connectionTone}>{connectionLabel}</StatusPill>}
          />
          <Row
            title="Admin API"
            description={
              isAdminApiConfigured
                ? "This deployment has an API URL configured."
                : "No API URL is configured for this deployment, so nothing here can load."
            }
            control={
              isAdminApiConfigured ? (
                <StatusPill tone="good">Configured</StatusPill>
              ) : (
                <StatusPill tone="bad">Missing</StatusPill>
              )
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink-900">Storefront content</h2>
        <p className="mt-1 text-sm text-ink-500">
          What customers see is edited where it lives, not here — one thing, one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/content">Site content &amp; reviews</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/outlets">Outlets &amp; service areas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/offers">Offers &amp; coupons</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
