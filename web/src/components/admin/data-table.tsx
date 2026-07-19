"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  /** Stable key — also the sort identifier. */
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Returning a value makes the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "center" | "right";
  /** Tailwind width/visibility classes applied to both header and cells. */
  className?: string;
  /** Header-only classes, e.g. `sr-only` for an action column. */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Describes the table for screen readers. Rendered visually hidden. */
  caption: string;
  pageSize?: number;
  initialSort?: { columnId: string; direction: SortDirection };
  onRowClick?: (row: T) => void;
  /** Replaces the built-in "no results" block. */
  empty?: React.ReactNode;
  /**
   * Card renderer used below `md`, where a wide table cannot breathe. When
   * omitted the table scrolls horizontally instead.
   */
  renderCard?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Generic, typed table with client-side sorting and pagination.
 *
 * Real `<table>` semantics throughout — sortable headers are buttons carrying
 * `aria-sort`, so keyboard and screen-reader users get the same affordances as
 * a mouse user. Sorting and paging live here rather than in each page so every
 * table in the panel behaves identically.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  caption,
  pageSize = 10,
  initialSort,
  onRowClick,
  empty,
  renderCard,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ columnId: string; direction: SortDirection } | null>(
    initialSort ?? null,
  );
  const [page, setPage] = React.useState(0);

  // Any change to the underlying rows (a filter, a search) invalidates the page
  // index — otherwise the operator lands on an empty page 4 of 2.
  const rowCount = data.length;
  React.useEffect(() => {
    setPage(0);
  }, [rowCount]);

  const sorted = React.useMemo(() => {
    if (!sort) return data;
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    if (!column?.sortValue) return data;
    const { sortValue } = column;

    return [...data].sort((a, b) => {
      const left = sortValue(a);
      const right = sortValue(b);
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right));
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [data, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(columnId: string) {
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
  }

  if (sorted.length === 0) {
    return (
      <>{empty ?? <EmptyState title="Nothing here yet" description="Try clearing your filters or widening the date range." />}</>
    );
  }

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  } as const;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Mobile: cards. Hidden entirely when the caller supplies no renderer. */}
      {renderCard && (
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map((row) => (
            <li key={getRowId(row)}>{renderCard(row)}</li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "overflow-x-auto rounded-2xl border border-ink-200/70 bg-white shadow-soft",
          renderCard && "hidden md:block",
        )}
      >
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ink-200/70 bg-ink-50/60">
              {columns.map((column) => {
                const isSorted = sort?.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      column.sortValue
                        ? isSorted
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-500",
                      alignClass[column.align ?? "left"],
                      column.className,
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition-colors hover:text-ink-900",
                          isSorted && "text-ink-900",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          <ChevronUp
                            className={cn(
                              "size-3.5 transition-transform duration-200",
                              sort.direction === "desc" && "rotate-180",
                            )}
                            aria-hidden
                          />
                        ) : (
                          <ChevronsUpDown className="size-3.5 text-ink-300" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-ink-100 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-brand-50/50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-4 py-3.5 align-middle text-ink-700",
                      alignClass[column.align ?? "left"],
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-ink-500" aria-live="polite">
            Showing{" "}
            <span className="font-medium tabular-nums text-ink-900">
              {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)}
            </span>{" "}
            of <span className="font-medium tabular-nums text-ink-900">{sorted.length}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft />
            </Button>

            {Array.from({ length: pageCount }, (_, index) => index)
              .filter(
                (index) =>
                  index === 0 ||
                  index === pageCount - 1 ||
                  Math.abs(index - safePage) <= 1,
              )
              .map((index, position, visible) => (
                <React.Fragment key={index}>
                  {position > 0 && visible[position - 1] !== index - 1 && (
                    <span className="px-1 text-ink-400" aria-hidden>
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Page ${index + 1}`}
                    aria-current={index === safePage ? "page" : undefined}
                    onClick={() => setPage(index)}
                    className={cn(
                      "size-9 rounded-full text-sm font-medium tabular-nums transition-colors",
                      index === safePage
                        ? "bg-ink-900 text-white"
                        : "text-ink-600 hover:bg-ink-100",
                    )}
                  >
                    {index + 1}
                  </button>
                </React.Fragment>
              ))}

            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
