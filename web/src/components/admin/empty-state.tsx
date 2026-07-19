import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

/** Shown whenever a filter, search or dataset returns nothing. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-ink-400 shadow-soft">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-display text-lg text-ink-900">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
