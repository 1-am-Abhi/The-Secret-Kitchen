import { cn } from "@/lib/utils";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  label: string;
  /** Big number in the middle of the ring. */
  centerValue?: string;
  centerLabel?: string;
  /** Ring thickness as a fraction of the radius. */
  thickness?: number;
  className?: string;
}

/**
 * Donut rendered as stroked arcs on a single circle.
 *
 * Using `stroke-dasharray` with an offset is far cheaper than generating arc
 * paths, and gives us perfectly even rounded caps between segments.
 */
export function DonutChart({
  segments,
  label,
  centerValue,
  centerLabel,
  thickness = 0.26,
  className,
}: DonutChartProps) {
  const size = 200;
  const radius = 78;
  const strokeWidth = radius * 2 * thickness;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let cursor = 0;

  return (
    <figure className={cn("flex w-full flex-col items-center", className)}>
      <div className="relative">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${size} ${size}`}
          className="size-44 -rotate-90 sm:size-48"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f3f5"
            strokeWidth={strokeWidth}
          />

          {total > 0 &&
            segments.map((segment) => {
              if (segment.value === 0) return null;
              const fraction = segment.value / total;
              const dash = fraction * circumference;
              // A 1.5px gap reads as separation without distorting small slices.
              const gap = Math.min(3, dash * 0.08);
              const offset = -cursor * circumference;
              cursor += fraction;

              return (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${Math.max(dash - gap, 0.5)} ${circumference}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              );
            })}
        </svg>

        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && (
              <span className="font-display text-3xl tabular-nums leading-none text-ink-900">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="mt-1 text-xs text-ink-500">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {segments.map((segment) => (
              <tr key={segment.label}>
                <th scope="row">{segment.label}</th>
                <td>{segment.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
