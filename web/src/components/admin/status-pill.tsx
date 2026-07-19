import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A single vocabulary for every state the panel renders — order lifecycle,
 * subscription state, payment state, stock level. Keeping them in one map means
 * "delivered" is the same green everywhere in the product.
 */
export type StatusTone =
  | "neutral"
  | "info"
  | "progress"
  | "transit"
  | "success"
  | "danger"
  | "muted";

const toneStyles: Record<StatusTone, string> = {
  neutral: "border-ink-200 bg-ink-50 text-ink-600 [&_.dot]:bg-ink-400",
  info: "border-sky-200 bg-sky-50 text-sky-700 [&_.dot]:bg-sky-500",
  progress: "border-amber-200 bg-amber-50 text-amber-700 [&_.dot]:bg-amber-500",
  transit: "border-brand-200 bg-brand-50 text-brand-700 [&_.dot]:bg-brand-500",
  success: "border-fresh-200 bg-fresh-50 text-fresh-700 [&_.dot]:bg-fresh-500",
  danger: "border-red-200 bg-red-50 text-red-700 [&_.dot]:bg-red-500",
  muted: "border-ink-200 bg-white text-ink-500 [&_.dot]:bg-ink-300",
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  label: string;
  /** Adds a soft pulse — reserved for states that need the kitchen's attention. */
  pulse?: boolean;
  size?: "sm" | "md";
}

export function StatusPill({
  tone = "neutral",
  label,
  pulse = false,
  size = "md",
  className,
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <span className="relative flex size-1.5 shrink-0">
        {pulse && (
          <span className="dot absolute inline-flex size-full animate-ping rounded-full opacity-70" />
        )}
        <span className="dot relative inline-flex size-1.5 rounded-full" />
      </span>
      {label}
    </span>
  );
}
