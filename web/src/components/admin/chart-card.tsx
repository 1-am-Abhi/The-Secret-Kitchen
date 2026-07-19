import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  description?: string;
  /** Filters, range switches or a legend, aligned to the right of the title. */
  actions?: React.ReactNode;
  /** Summary figure rendered large under the title. */
  value?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

/** The frame every chart in the panel sits inside — one card, one grammar. */
export function ChartCard({
  title,
  description,
  actions,
  value,
  footer,
  className,
  bodyClassName,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden rounded-3xl", className)}>
      <div className="flex flex-col gap-3 p-5 pb-0 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-0">
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight text-ink-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          {value && (
            <p className="mt-3 font-display text-3xl tabular-nums leading-none text-ink-900">
              {value}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      <div className={cn("flex-1 p-5 sm:p-6", bodyClassName)}>{children}</div>

      {footer && (
        <div className="border-t border-ink-100 px-5 py-4 text-sm text-ink-500 sm:px-6">
          {footer}
        </div>
      )}
    </Card>
  );
}

/** Swatch + label pair used beneath the donut and stacked charts. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm text-ink-600">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
          {item.value && (
            <span className="font-medium tabular-nums text-ink-900">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ordered categorical palette.
 *
 * Brand orange leads, then a warm-to-cool progression chosen so adjacent
 * segments stay distinguishable in greyscale and for the common forms of colour
 * blindness. Never reorder — chart colours must be stable across screens.
 */
export const CHART_COLORS = [
  "#ff6b00", // brand-500
  "#1f2937", // ink-800
  "#22c55e", // fresh-500
  "#f59e0b", // amber-500
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#84cc16", // lime-500
  "#6b7280", // ink-500
  "#ef4444", // red-500
] as const;

/** Cycles the palette so any series length is covered. */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
