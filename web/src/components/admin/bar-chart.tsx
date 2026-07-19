import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  /** Overrides the default brand colour for this bar. */
  color?: string;
  /** Right-hand annotation, e.g. an order count or a delta. */
  meta?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  label: string;
  orientation?: "horizontal" | "vertical";
  formatValue?: (value: number) => string;
  color?: string;
  /** Highlights the tallest bar in brand orange and mutes the rest. */
  emphasiseMax?: boolean;
  className?: string;
}

/**
 * CSS-driven bars — no SVG needed for a rectangle, and CSS gives us the
 * rounded caps and hover states for free while staying fully responsive.
 */
export function BarChart({
  data,
  label,
  orientation = "horizontal",
  formatValue = (value) => String(value),
  color = "#ff6b00",
  emphasiseMax = false,
  className,
}: BarChartProps) {
  const max = Math.max(...data.map((datum) => datum.value), 1);

  if (orientation === "vertical") {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn("flex h-52 items-end gap-1.5 sm:gap-2", className)}
      >
        {data.map((datum) => {
          const height = Math.max((datum.value / max) * 100, 2);
          const isMax = emphasiseMax && datum.value === max;
          return (
            <div key={datum.label} className="group flex min-w-0 flex-1 flex-col justify-end">
              <span className="mb-1.5 text-center text-[10px] font-medium tabular-nums text-ink-400 opacity-0 transition-opacity group-hover:opacity-100">
                {formatValue(datum.value)}
              </span>
              <div
                className="w-full rounded-t-lg transition-[filter] duration-200 group-hover:brightness-110"
                style={{
                  height: `${height}%`,
                  backgroundColor: datum.color ?? color,
                  opacity: emphasiseMax && !isMax ? 0.32 : 1,
                }}
              />
              <span className="mt-2 truncate text-center text-[10px] text-ink-400 sm:text-[11px]">
                {datum.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul role="img" aria-label={label} className={cn("flex flex-col gap-3.5", className)}>
      {data.map((datum) => (
        <li key={datum.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-ink-700">{datum.label}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              {datum.meta && <span className="text-xs text-ink-400">{datum.meta}</span>}
              <span className="text-sm font-semibold tabular-nums text-ink-900">
                {formatValue(datum.value)}
              </span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)]"
              style={{
                width: `${Math.max((datum.value / max) * 100, 1.5)}%`,
                backgroundColor: datum.color ?? color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
