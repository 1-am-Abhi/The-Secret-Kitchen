import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Consistent section chrome. Every page section on the site uses these so
 * vertical rhythm, eyebrow styling and heading scale never drift.
 */

export function Section({
  className,
  tone = "default",
  size = "md",
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  tone?: "default" | "muted" | "cream" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <section
      className={cn(
        "relative",
        { sm: "py-14 lg:py-20", md: "py-20 lg:py-28", lg: "py-24 lg:py-36" }[size],
        {
          default: "bg-white",
          muted: "bg-ink-50",
          cream: "bg-cream",
          dark: "bg-ink-900 text-white",
        }[tone],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "light",
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  /** Optional "view all" style link rendered opposite the heading. */
  action?: { label: string; href: string };
  className?: string;
}) {
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "items-start",
        action && "sm:flex-row sm:items-end sm:justify-between sm:text-left",
        className,
      )}
    >
      <Reveal className={cn("max-w-2xl", align === "center" && !action && "mx-auto")}>
        {eyebrow && (
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
              isDark ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-600",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {eyebrow}
          </span>
        )}
        <h2
          className={cn(
            "mt-4 text-3xl leading-[1.1] sm:text-4xl lg:text-[2.75rem]",
            isDark ? "text-white" : "text-ink-900",
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "mt-4 text-base leading-relaxed sm:text-lg",
              isDark ? "text-ink-400" : "text-ink-500",
            )}
          >
            {description}
          </p>
        )}
      </Reveal>

      {action && (
        <Reveal delay={0.15} className="shrink-0">
          <Link
            href={action.href}
            className={cn(
              "group inline-flex items-center gap-2 text-sm font-semibold transition-colors",
              isDark ? "text-brand-300 hover:text-brand-200" : "text-brand-600 hover:text-brand-700",
            )}
          >
            {action.label}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>
      )}
    </div>
  );
}
