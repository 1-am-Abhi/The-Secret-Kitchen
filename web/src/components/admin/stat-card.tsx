"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { findAdminIcon } from "@/components/admin/icon";
import { CountUp } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: number;
  /** Percentage change against the previous period. */
  change?: number;
  format?: "currency" | "number" | "percent";
  hint?: string;
  /**
   * Name of a glyph in the admin icon map — a *string*, not a component, so a
   * Server Component can pass it across the client boundary.
   */
  icon?: string;
  /** Renders a sparkline or any small visual under the value. */
  visual?: React.ReactNode;
  /** Inverts the good/bad colouring — for metrics where down is better. */
  invertTrend?: boolean;
  className?: string;
}

/** Compact rupee label without pulling the value out of the CountUp animation. */
function currencyParts(value: number): { prefix: string; value: number; suffix: string; decimals: number } {
  if (value >= 10_000_000) return { prefix: "₹", value: value / 10_000_000, suffix: "Cr", decimals: 2 };
  if (value >= 100_000) return { prefix: "₹", value: value / 100_000, suffix: "L", decimals: 2 };
  if (value >= 10_000) return { prefix: "₹", value: value / 1_000, suffix: "K", decimals: 1 };
  return { prefix: "₹", value, suffix: "", decimals: 0 };
}

export function StatCard({
  label,
  value,
  change,
  format = "number",
  hint,
  icon,
  visual,
  invertTrend = false,
  className,
}: StatCardProps) {
  const Icon = findAdminIcon(icon);

  const parts =
    format === "currency"
      ? currencyParts(value)
      : { prefix: "", value, suffix: format === "percent" ? "%" : "", decimals: format === "percent" ? 1 : 0 };

  const isFlat = change === undefined || Math.abs(change) < 0.05;
  const isUp = (change ?? 0) > 0;
  const isGood = invertTrend ? !isUp : isUp;
  const TrendIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-3xl p-5 transition-shadow duration-300 hover:shadow-lift sm:p-6",
        className,
      )}
    >
      {/* Warm wash that lifts the tile off the page without adding a border. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-brand-50 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>

      <p className="relative mt-3 font-display text-3xl tabular-nums leading-none text-ink-900 sm:text-4xl">
        <CountUp
          value={parts.value}
          prefix={parts.prefix}
          suffix={parts.suffix}
          decimals={parts.decimals}
        />
      </p>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        {change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              isFlat
                ? "bg-ink-100 text-ink-600"
                : isGood
                  ? "bg-fresh-50 text-fresh-700"
                  : "bg-red-50 text-red-600",
            )}
          >
            <TrendIcon className="size-3" aria-hidden />
            {isFlat ? "0%" : `${Math.abs(change).toFixed(1)}%`}
            <span className="sr-only">
              {isFlat ? "no change" : isUp ? "increase" : "decrease"} versus previous period
            </span>
          </span>
        )}
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>

      {visual && <div className="relative mt-4">{visual}</div>}
    </Card>
  );
}
