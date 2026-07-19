"use client";

import * as React from "react";
import { CheckCircle2, MapPin, Search, XCircle } from "lucide-react";

import { Section, SectionHeading } from "@/components/layout/section";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deliveryAreas, findDeliveryArea } from "@/data/content";
import { whatsappLink } from "@/config/site";
import { cn } from "@/lib/utils";
import type { DeliveryArea } from "@/types";

type LookupResult = { status: "idle" } | { status: "found"; area: DeliveryArea } | { status: "missing" };

/**
 * Delivery coverage with a pincode checker.
 *
 * Answering "do you deliver to me?" before the customer has to browse the menu
 * removes the single biggest reason people bounce from a cloud kitchen site.
 */
export function DeliveryAreas() {
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<LookupResult>({ status: "idle" });

  const handleCheck = (event: React.FormEvent) => {
    event.preventDefault();
    const area = findDeliveryArea(query);
    setResult(area ? { status: "found", area } : { status: "missing" });
  };

  return (
    <Section tone="default" id="delivery-areas">
      <div className="container-page">
        <SectionHeading
          eyebrow="Delivery areas"
          title="We probably already deliver to you"
          description="Twelve neighbourhoods across Noida and Ghaziabad, with more added every quarter."
        />

        {/* Pincode checker */}
        <form
          onSubmit={handleCheck}
          className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
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
                setResult({ status: "idle" });
              }}
              placeholder="Enter your pincode or area name"
              className="pl-11"
            />
          </div>
          <Button type="submit" size="lg" disabled={!query.trim()}>
            Check coverage
          </Button>
        </form>

        {/* aria-live so screen readers announce the outcome */}
        <div aria-live="polite" className="mx-auto mt-4 max-w-xl">
          {result.status === "found" && (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-fresh-50 px-5 py-4 text-sm text-fresh-700">
              <CheckCircle2 className="size-4 shrink-0" />
              Yes! We deliver to <strong>{result.area.name}</strong> in about{" "}
              {result.area.etaMinutes} minutes.
            </p>
          )}
          {result.status === "missing" && (
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
        </div>

        <Stagger
          className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          stagger={0.05}
        >
          {deliveryAreas.map((area) => (
            <StaggerItem key={area.name}>
              <div
                className={cn(
                  "flex h-full flex-col gap-2 rounded-2xl border p-5 transition-colors",
                  area.freeDelivery
                    ? "border-fresh-200 bg-fresh-50/50"
                    : "border-ink-200/70 bg-white",
                )}
              >
                <span className="flex items-start gap-2">
                  <MapPin
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      area.freeDelivery ? "text-fresh-600" : "text-ink-400",
                    )}
                  />
                  <span className="text-sm font-semibold text-ink-900">{area.name}</span>
                </span>
                <span className="text-xs text-ink-400">
                  {area.pincode} · ~{area.etaMinutes} min
                </span>
                {area.freeDelivery && (
                  <Badge variant="success" size="sm" className="mt-auto w-fit">
                    Free delivery zone
                  </Badge>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
