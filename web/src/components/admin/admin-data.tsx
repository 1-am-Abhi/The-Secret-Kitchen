"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminFailure, AdminResult } from "@/lib/admin-orders";
import { cn } from "@/lib/utils";

/* ========================================================================== */
/*  Query hook                                                                */
/* ========================================================================== */

export interface AdminQuery<T> {
  /** `null` until the first successful response — never a placeholder value. */
  data: T | null;
  /** Set when the last attempt failed for a reason the operator should see. */
  failure: AdminFailure | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetch one admin resource into render-safe state.
 *
 * The panel has exactly three honest states and this returns all three
 * separately: still loading, failed (with the reason), or loaded — including
 * loaded-and-empty, which is a real answer about a kitchen with no orders yet
 * and must never be dressed up as anything else.
 *
 * `run` must be referentially stable (wrap it in `useCallback`); every change
 * to it re-runs the query, which is how filters and search re-fetch.
 *
 * `revision` is the counter the order stream bumps on every inbound event —
 * passing it here is how a screen stays live off SSE instead of polling.
 */
export function useAdminQuery<T>(
  run: (signal: AbortSignal) => Promise<AdminResult<{ data: T }>>,
  revision = 0,
): AdminQuery<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [failure, setFailure] = React.useState<AdminFailure | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    void run(controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.ok) {
        setData(result.data);
        setFailure(null);
      } else if (result.reason !== "invalid") {
        // `invalid` is how a cancelled request surfaces; anything else is a
        // genuine fault and the previous rows must not be left on screen
        // pretending to still be current.
        setData(null);
        setFailure(result);
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [run, nonce, revision]);

  const reload = React.useCallback(() => setNonce((current) => current + 1), []);

  return { data, failure, loading, reload };
}

/* ========================================================================== */
/*  Failure notice                                                            */
/* ========================================================================== */

const REASON_TITLE: Record<AdminFailure["reason"], string> = {
  offline: "Not connected to the kitchen API",
  unauthorized: "This admin session is not authorised",
  network: "The kitchen API could not be reached",
  server: "The kitchen API returned an error",
  invalid: "That request could not be completed",
};

/**
 * The replacement for the old "showing sample data" banner.
 *
 * When the API is unreachable the panel shows nothing rather than something
 * invented — a blank screen with an explanation is the only honest option for
 * an operations tool whose numbers people act on.
 */
export function ApiErrorNotice({
  failure,
  onRetry,
  className,
}: {
  failure: AdminFailure;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 sm:flex-row sm:items-start",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
      <div className="min-w-0 flex-1 text-sm text-red-900">
        <p className="font-semibold">{REASON_TITLE[failure.reason]}</p>
        <p className="mt-0.5 leading-relaxed text-red-800">
          {failure.message} Nothing is shown here rather than figures that are not real.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Skeletons                                                                 */
/* ========================================================================== */

/** Placeholder rows for a table or list that is still loading. */
export function LoadingRows({ rows = 6, label }: { rows?: number; label: string }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-soft"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-ink-100 px-4 py-4 last:border-0"
        >
          <div className="h-3 w-28 animate-pulse rounded-full bg-ink-100" />
          <div className="h-3 w-40 animate-pulse rounded-full bg-ink-100" />
          <div className="ml-auto h-6 w-24 animate-pulse rounded-full bg-ink-100" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder block sized like a chart or KPI tile. */
export function LoadingBlock({ className, label }: { className?: string; label: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn("animate-pulse rounded-3xl bg-ink-100/70", className)}
    />
  );
}
