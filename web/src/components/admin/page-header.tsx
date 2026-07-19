import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Small uppercase label above the title — usually the section name. */
  eyebrow?: string;
  /** Buttons, filters or anything else anchored to the right of the title. */
  actions?: React.ReactNode;
  className?: string;
}

/** The consistent opening block of every admin screen. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl leading-tight text-ink-900 sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
