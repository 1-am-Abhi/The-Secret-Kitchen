"use client";

import * as React from "react";
import { Search, SearchX, X } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { faqCategories, faqs } from "@/data/faq";
import { cn } from "@/lib/utils";

import { Highlight } from "./highlight";

const TABS = [{ id: "all", label: "All questions" }, ...faqCategories] as const;
type TabId = (typeof TABS)[number]["id"];

const CATEGORY_LABEL = Object.fromEntries(
  faqCategories.map((category) => [category.id, category.label]),
) as Record<string, string>;

export function FaqExplorer() {
  const [tab, setTab] = React.useState<TabId>("all");
  const [query, setQuery] = React.useState("");

  const trimmed = query.trim().toLowerCase();

  // Search runs across every category, then the tab narrows it. Doing it in
  // this order means the per-tab counts below reflect what a search would
  // actually surface, rather than the unfiltered totals.
  const searched = React.useMemo(() => {
    if (!trimmed) return faqs;
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(trimmed) ||
        faq.answer.toLowerCase().includes(trimmed),
    );
  }, [trimmed]);

  const visible = React.useMemo(
    () => (tab === "all" ? searched : searched.filter((faq) => faq.category === tab)),
    [searched, tab],
  );

  function countFor(id: TabId) {
    return id === "all" ? searched.length : searched.filter((f) => f.category === id).length;
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <label htmlFor="faq-search" className="sr-only">
          Search frequently asked questions
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search — try “pause”, “refund” or “Jain”"
            className="h-14 rounded-2xl pl-12 pr-12 text-base shadow-soft"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {/* Politely announced so screen-reader users hear the result count change
            as they type, without the input losing focus. */}
        <p aria-live="polite" className="mt-3 text-center text-sm text-ink-500">
          {trimmed
            ? `${visible.length} ${visible.length === 1 ? "answer" : "answers"} matching “${query.trim()}”`
            : `Browse all ${faqs.length} answers, or search above.`}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="mt-10">
        <div className="no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:flex sm:justify-center sm:px-0">
          <TabsList className="flex-nowrap">
            {TABS.map((entry) => {
              const count = countFor(entry.id);
              return (
                <TabsTrigger
                  key={entry.id}
                  value={entry.id}
                  // Zero-result tabs stay clickable but visually recede, so the
                  // user can see where their search did and did not land.
                  className={cn(count === 0 && "opacity-45")}
                >
                  {entry.label}
                  <span className="text-xs tabular-nums opacity-60">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* One content region, keyed to whichever tab is active — the list is
            derived state, so duplicating a panel per category would be waste. */}
        <TabsContent value={tab} className="mx-auto mt-8 max-w-3xl">
          {visible.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              // Re-key on the filter so an open panel does not carry over onto a
              // different question when the visible list changes underneath it.
              key={`${tab}-${trimmed}`}
              className="space-y-3"
            >
              {visible.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger>
                    <span className="flex flex-col items-start gap-2">
                      {tab === "all" && (
                        <Badge variant="muted" size="sm" className="font-sans">
                          {CATEGORY_LABEL[faq.category] ?? faq.category}
                        </Badge>
                      )}
                      <span>
                        <Highlight text={faq.question} query={trimmed} />
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Highlight text={faq.answer} query={trimmed} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 py-16 text-center">
              <SearchX className="size-8 text-ink-300" aria-hidden />
              <p className="font-display text-xl text-ink-900">No answer for that yet</p>
              <p className="max-w-sm text-sm leading-relaxed text-ink-500">
                Try a different word, or ask us directly — we answer on WhatsApp within a couple
                of hours and add good questions to this page.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
