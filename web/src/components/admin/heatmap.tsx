import { cn } from "@/lib/utils";

export interface HeatmapProps {
  /** Row labels, top to bottom. */
  rows: string[];
  /** Column labels, left to right. */
  columns: string[];
  /** `values[rowIndex][columnIndex]`. */
  values: number[][];
  label: string;
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * CSS-grid heatmap. Intensity is mapped through a single brand hue rather than
 * a rainbow scale, so the eye reads magnitude rather than category — and the
 * lightest cells keep enough contrast for their labels to remain legible.
 */
export function Heatmap({
  rows,
  columns,
  values,
  label,
  formatValue = (value) => String(value),
  className,
}: HeatmapProps) {
  const max = Math.max(...values.flat(), 1);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[38rem] border-separate border-spacing-1 text-xs">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10">
              <span className="sr-only">Day</span>
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="pb-1 text-center text-[10px] font-medium text-ink-400"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row}>
              <th
                scope="row"
                className="pr-2 text-right text-[11px] font-medium text-ink-500"
              >
                {row}
              </th>
              {columns.map((column, columnIndex) => {
                const value = values[rowIndex]?.[columnIndex] ?? 0;
                const intensity = value / max;
                return (
                  <td key={column} className="p-0">
                    <div
                      title={`${row} ${column}: ${formatValue(value)}`}
                      className="flex h-9 items-center justify-center rounded-lg text-[10px] font-medium tabular-nums transition-transform duration-200 hover:scale-105"
                      style={{
                        backgroundColor: `rgb(255 107 0 / ${(0.06 + intensity * 0.88).toFixed(3)})`,
                        color: intensity > 0.55 ? "#fff" : "#4b5563",
                      }}
                    >
                      {formatValue(value)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
