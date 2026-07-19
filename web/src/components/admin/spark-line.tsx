import { cn } from "@/lib/utils";

/**
 * Hand-authored SVG charts.
 *
 * The panel deliberately ships no charting library: every visual here is a few
 * dozen lines of path maths, which keeps the client bundle small and gives us
 * exact control over the brand's line weights and radii.
 */

/** Maps a value series into `[x, y]` pairs inside a 0…width / 0…height box. */
function toPoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
): [number, number][] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  return values.map((value, index) => [
    index * step,
    padding + innerHeight - ((value - min) / span) * innerHeight,
  ]);
}

/**
 * Catmull-Rom → cubic Bézier. Produces the soft, non-overshooting curve the
 * brand uses, rather than the jagged polyline a naive `L` path would give.
 */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  }

  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export interface SparkLineProps {
  values: number[];
  /** Accessible summary — the chart is `img` role, so this is its alt text. */
  label: string;
  color?: string;
  /** Fills the area under the line with a fading gradient. */
  area?: boolean;
  /** Draws a dot on the final point. */
  showLast?: boolean;
  strokeWidth?: number;
  className?: string;
}

/**
 * Gradient ids are derived from the colour rather than a counter or `useId`.
 * SVG ids are document-global, so two sparklines of the same colour would
 * otherwise fight; deriving from the colour makes the collision harmless
 * because the two definitions are byte-identical — and it keeps these
 * components render-pure, so they work in Server Components too.
 */
function gradientIdFor(prefix: string, color: string): string {
  return `${prefix}-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function SparkLine({
  values,
  label,
  color = "#ff6b00",
  area = true,
  showLast = false,
  strokeWidth = 2,
  className,
}: SparkLineProps) {
  const gradientId = gradientIdFor("spark", color);

  const width = 100;
  const height = 32;
  const points = toPoints(values, width, height, strokeWidth);
  const line = smoothPath(points);
  const last = points[points.length - 1];

  if (points.length === 0) return null;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-10 w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {area && (
        <path
          d={`${line} L${width},${height} L0,${height} Z`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
      )}

      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {showLast && last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.5}
          fill="#fff"
          stroke={color}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

export interface AreaChartPoint {
  label: string;
  value: number;
  /** Optional second series drawn as a lighter line beneath the primary. */
  secondary?: number;
}

export interface AreaChartProps {
  points: AreaChartPoint[];
  label: string;
  color?: string;
  secondaryColor?: string;
  /** Formats the y-axis ticks and the accessible table fallback. */
  formatValue?: (value: number) => string;
  /** How many x-axis labels to print. The rest are thinned out. */
  xTicks?: number;
  className?: string;
}

/**
 * Full area chart with gridlines and axes — the dashboard's revenue view.
 * Rendered at a fixed viewBox and scaled by CSS, so it stays crisp at any size.
 */
export function AreaChart({
  points,
  label,
  color = "#ff6b00",
  secondaryColor = "#1f2937",
  formatValue = (value) => String(value),
  xTicks = 6,
  className,
}: AreaChartProps) {
  const gradientId = gradientIdFor("area", color);

  const width = 720;
  const height = 260;
  const padLeft = 56;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 32;

  const values = points.map((p) => p.value);
  const secondary = points.map((p) => p.secondary ?? 0);
  const hasSecondary = points.some((p) => p.secondary !== undefined);

  const max = Math.max(...values, ...(hasSecondary ? secondary : []));
  const min = 0;
  const span = max - min || 1;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const project = (value: number, index: number): [number, number] => [
    padLeft + index * step,
    padTop + innerHeight - ((value - min) / span) * innerHeight,
  ];

  const primaryPoints = values.map(project);
  const secondaryPoints = secondary.map(project);
  const primaryPath = smoothPath(primaryPoints);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    y: padTop + innerHeight - fraction * innerHeight,
    value: min + fraction * span,
  }));

  const labelEvery = Math.max(1, Math.ceil(points.length / xTicks));

  return (
    <figure className={cn("w-full", className)}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full sm:h-64"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={tick.y}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray={tick.value === 0 ? undefined : "3 5"}
            />
            <text
              x={padLeft - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-ink-400 text-[11px] tabular-nums"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}

        <path
          d={`${primaryPath} L${padLeft + innerWidth},${padTop + innerHeight} L${padLeft},${padTop + innerHeight} Z`}
          fill={`url(#${gradientId})`}
        />

        {hasSecondary && (
          <path
            d={smoothPath(secondaryPoints)}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            opacity={0.55}
          />
        )}

        <path
          d={primaryPath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {primaryPoints.map(([x, y], index) =>
          index === primaryPoints.length - 1 ? (
            <circle key={index} cx={x} cy={y} r={4.5} fill="#fff" stroke={color} strokeWidth={2.5} />
          ) : null,
        )}

        {points.map((point, index) =>
          index % labelEvery === 0 || index === points.length - 1 ? (
            <text
              key={point.label}
              x={padLeft + index * step}
              y={height - 10}
              textAnchor={index === points.length - 1 ? "end" : "middle"}
              className="fill-ink-400 text-[11px]"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>

      {/* Screen readers get the numbers, not just the shape. */}
      <figcaption className="sr-only">
        <table>
          <caption>{label}</caption>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <th scope="row">{point.label}</th>
                <td>{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
