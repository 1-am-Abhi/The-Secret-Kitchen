import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Wordmark with a hand-drawn cloche mark. Pure SVG + type — no raster asset —
 * so it stays sharp on every display and costs nothing to load.
 */
export function Logo({
  className,
  variant = "dark",
  showTagline = false,
  href = "/",
}: {
  className?: string;
  variant?: "dark" | "light";
  showTagline?: boolean;
  href?: string | null;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[17px] font-bold tracking-tight",
            variant === "light" ? "text-white" : "text-ink-900",
          )}
        >
          The Secret{" "}
          <span className={variant === "light" ? "text-brand-300" : "text-brand-500"}>
            Kitchen
          </span>
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.18em]",
              variant === "light" ? "text-white/60" : "text-ink-400",
            )}
          >
            {siteConfig.tagline}
          </span>
        )}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} — home`}
      className="rounded-lg transition-opacity hover:opacity-85"
    >
      {content}
    </Link>
  );
}

/** The mark on its own — favicon, app icon, loading states. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="tsk-mark" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#FF8F3D" />
          <stop offset="1" stopColor="#FF6B00" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#tsk-mark)" />
      {/* Cloche dome */}
      <path
        d="M10 25.5c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Handle */}
      <circle cx="20" cy="13.2" r="1.9" fill="white" />
      {/* Base plate */}
      <path d="M7.5 26.8h25" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      {/* Steam wisp — the "secret" escaping */}
      <path
        d="M20 21.2c1.6-1.1 1.6-2.6 0-3.7"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}
