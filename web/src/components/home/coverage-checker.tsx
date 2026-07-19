"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappLink } from "@/config/site";
import { checkDeliveryCoverage, type CoverageResult } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "answered"; result: CoverageResult }
  | { status: "unavailable" };

/**
 * "Do you deliver to me?" — answered by the outlets table, not a bundled list.
 *
 * When the API cannot be reached the checker says so instead of guessing; a
 * wrong "yes we deliver" costs a customer an order they never receive.
 */
export function CoverageChecker() {
  const [query, setQuery] = React.useState("");
  const [state, setState] = React.useState<State>({ status: "idle" });

  const handleCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    const needle = query.trim();
    if (!needle) return;

    setState({ status: "checking" });
    const result = await checkDeliveryCoverage(needle);
    setState(result ? { status: "answered", result } : { status: "unavailable" });
  };

  return (
    <>
      <form onSubmit={handleCheck} className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <label htmlFor="pincode-check" className="sr-only">
            Enter your pincode or area
          </label>
          <Input
            id="pincode-check"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setState({ status: "idle" });
            }}
            placeholder="Enter your pincode or area name"
            className="pl-11"
          />
        </div>
        <Button type="submit" size="lg" disabled={!query.trim() || state.status === "checking"}>
          {state.status === "checking" ? <Loader2 className="animate-spin" /> : null}
          Check coverage
        </Button>
      </form>

      {/* aria-live so screen readers announce the outcome */}
      <div aria-live="polite" className="mx-auto mt-4 max-w-xl">
        {state.status === "answered" && state.result.covered && state.result.area && (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-fresh-50 px-5 py-4 text-sm text-fresh-700">
            <CheckCircle2 className="size-4 shrink-0" />
            Yes! We deliver to <strong>{state.result.area.name}</strong> in about{" "}
            {state.result.area.etaMinutes} minutes.
          </p>
        )}

        {state.status === "answered" && !state.result.covered && (
          <p className="flex flex-col items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-center text-sm text-brand-700 sm:flex-row sm:justify-center">
            <span className="flex items-center gap-2">
              <XCircle className="size-4 shrink-0" />
              Not there yet — but message us and we will see what we can do.
            </span>
            <a
              href={whatsappLink(`Hi! Do you deliver to ${query}?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-semibold underline underline-offset-4"
            >
              Ask on WhatsApp
            </a>
          </p>
        )}

        {state.status === "unavailable" && (
          <p className="flex flex-col items-center gap-3 rounded-2xl bg-ink-50 px-5 py-4 text-center text-sm text-ink-600 sm:flex-row sm:justify-center">
            <span>We could not check coverage just now.</span>
            <a
              href={whatsappLink(`Hi! Do you deliver to ${query}?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-semibold underline underline-offset-4"
            >
              Ask us on WhatsApp
            </a>
          </p>
        )}
      </div>
    </>
  );
}
