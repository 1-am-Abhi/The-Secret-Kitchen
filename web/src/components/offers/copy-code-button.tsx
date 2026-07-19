"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * The coupon code, rendered as one big copy target.
 *
 * navigator.clipboard is unavailable on insecure origins and in some in-app
 * browsers, so a hidden-textarea + execCommand path keeps the button working
 * everywhere rather than silently failing.
 */
export function CopyCodeButton({
  code,
  tone = "light",
  className,
}: {
  code: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeout = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timeout.current), []);

  async function copy() {
    let ok = true;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const field = document.createElement("textarea");
        field.value = code;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        ok = document.execCommand("copy");
        document.body.removeChild(field);
      }
    } catch {
      ok = false;
    }

    if (ok) {
      setCopied(true);
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCopied(false), 2200);
      toast.success(`${code} copied`, {
        description: "Paste it in the coupon box at checkout to apply the discount.",
      });
    } else {
      toast.error("Could not copy automatically", {
        description: `Your code is ${code} — select and copy it manually.`,
      });
    }
  }

  const dark = tone === "dark";

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy coupon code ${code}`}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors duration-300",
        dark
          ? "border-white/30 bg-white/10 hover:border-white/60 hover:bg-white/15"
          : "border-brand-300 bg-brand-50/70 hover:border-brand-500 hover:bg-brand-50",
        className,
      )}
    >
      <span
        className={cn(
          "font-mono text-base font-semibold tracking-[0.14em]",
          dark ? "text-white" : "text-brand-700",
        )}
      >
        {code}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
          dark ? "text-white/70 group-hover:text-white" : "text-brand-600",
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </span>
      {/* Announced politely so keyboard and screen-reader users get confirmation
          without the toast, which is visual-first. */}
      <span className="sr-only" role="status">
        {copied ? `${code} copied to clipboard` : ""}
      </span>
    </button>
  );
}
