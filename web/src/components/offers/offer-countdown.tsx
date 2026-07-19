"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

function parts(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Live "expires in" ticker.
 *
 * The countdown deliberately renders nothing on the server and on the first
 * client paint: `Date.now()` differs between the two, which would guarantee a
 * hydration mismatch. The static expiry date is shown until the timer mounts,
 * so the offer's validity is never invisible.
 */
export function OfferCountdown({
  validUntil,
  className,
  tone = "light",
}: {
  validUntil: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const target = React.useMemo(() => new Date(validUntil).getTime(), [validUntil]);
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const muted = tone === "dark" ? "text-white/60" : "text-ink-500";
  const strong = tone === "dark" ? "text-white" : "text-ink-900";

  if (remaining === null) {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs", muted, className)}>
        <Clock className="size-3.5" aria-hidden />
        Valid until {formatDate(validUntil)}
      </p>
    );
  }

  if (remaining <= 0) {
    return (
      <p className={cn("inline-flex items-center gap-1.5 text-xs", muted, className)}>
        <Clock className="size-3.5" aria-hidden />
        This offer has expired
      </p>
    );
  }

  const { days, hours, minutes, seconds } = parts(remaining);
  const urgent = days < 3;

  return (
    <p
      className={cn("inline-flex items-center gap-1.5 text-xs", muted, className)}
      // Silent to assistive tech: a per-second live region would be unusable.
      // The static expiry date in the terms list carries the same information.
      aria-hidden
    >
      <Clock className={cn("size-3.5", urgent && "text-brand-500")} />
      Ends in{" "}
      <span className={cn("font-semibold tabular-nums", urgent ? "text-brand-600" : strong)}>
        {days > 0 ? `${days}d ` : ""}
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    </p>
  );
}
