"use client";

import * as React from "react";
import { Cookie, Moon, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { weeklyMenu } from "@/data/tiffin";
import { cn } from "@/lib/utils";

/**
 * Published sample weekly menu.
 *
 * Desktop gets a scannable table; mobile switches to a day-picker with cards,
 * because a seven-column table is unreadable below ~900px.
 */
export function WeeklyMenu() {
  const [activeDay, setActiveDay] = React.useState(0);

  return (
    <div>
      {/* ---- Mobile: day picker ---- */}
      <div className="lg:hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {weeklyMenu.map((day, index) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(index)}
              aria-pressed={activeDay === index}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                activeDay === index
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-600",
              )}
            >
              {day.day.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <MealCard
            icon={Sun}
            label="Lunch"
            items={weeklyMenu[activeDay].lunch}
            tone="lunch"
          />
          <MealCard
            icon={Moon}
            label="Dinner"
            items={weeklyMenu[activeDay].dinner}
            tone="dinner"
          />
          {weeklyMenu[activeDay].sweet && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4">
              <Cookie className="size-5 shrink-0 text-brand-500" />
              <span className="text-sm text-brand-700">
                Sweet of the day: <strong>{weeklyMenu[activeDay].sweet}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Desktop: full week table ---- */}
      <div className="hidden overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-soft lg:block">
        <table className="w-full">
          <caption className="sr-only">
            Sample weekly tiffin menu — lunch and dinner for each day
          </caption>
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              <th
                scope="col"
                className="w-32 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                Day
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="size-3.5 text-brand-400" />
                  Lunch
                </span>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="size-3.5 text-ink-400" />
                  Dinner
                </span>
              </th>
              <th
                scope="col"
                className="w-40 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                Sweet
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {weeklyMenu.map((day) => (
              <tr key={day.day} className="transition-colors hover:bg-brand-50/40">
                <th scope="row" className="px-6 py-5 text-left align-top">
                  <span className="font-display text-base font-semibold text-ink-900">
                    {day.day}
                  </span>
                </th>
                <td className="px-6 py-5 align-top text-sm text-ink-600">
                  {day.lunch.join(" · ")}
                </td>
                <td className="px-6 py-5 align-top text-sm text-ink-600">
                  {day.dinner.join(" · ")}
                </td>
                <td className="px-6 py-5 align-top">
                  {day.sweet ? (
                    <Badge variant="default" size="sm">
                      {day.sweet}
                    </Badge>
                  ) : (
                    <span className="text-sm text-ink-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-center text-sm text-ink-400">
        This is a sample week. The live menu runs on a 28-day rotation and is
        published every Sunday — no dish repeats within a fortnight.
      </p>
    </div>
  );
}

function MealCard({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: typeof Sun;
  label: string;
  items: string[];
  tone: "lunch" | "dinner";
}) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Icon
          className={cn("size-4", tone === "lunch" ? "text-brand-500" : "text-ink-500")}
        />
        {label}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-ink-50 px-3 py-1.5 text-xs text-ink-600"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
