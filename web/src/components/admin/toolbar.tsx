"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

/** The filter strip that sits above every table and grid in the panel. */
export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-soft lg:flex-row lg:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Pushes everything after it to the right edge of the toolbar. */
export function ToolbarSpacer() {
  return <div className="hidden flex-1 lg:block" />;
}

export interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name — the visible label is the placeholder. */
  label: string;
  className?: string;
}

export function SearchField({
  value,
  onValueChange,
  placeholder = "Search…",
  label,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative min-w-0 flex-1 lg:max-w-xs", className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 border-ink-200 pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export interface FilterChipsProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onValueChange: (value: T) => void;
  /** Names the group for assistive technology. */
  label: string;
  className?: string;
}

/**
 * A horizontally scrollable row of filter chips. Implemented as a radio group
 * rather than buttons so screen readers announce the selected option and
 * arrow keys move between them.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: FilterChipsProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
              active
                ? "bg-ink-900 text-white shadow-soft"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200 hover:text-ink-900",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  active ? "bg-white/20" : "bg-white text-ink-500",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
