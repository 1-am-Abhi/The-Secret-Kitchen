"use client";

import * as React from "react";
import { Check, Sparkles, X } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscribeDialog } from "@/components/tiffin/subscribe-dialog";
import {
  calculatePlanTotal,
  maxMonthlyDiscountPercent,
  monthlyDiscountPercent,
  monthlySavings,
  tiffinPlans,
} from "@/data/tiffin";
import { mealsPerDay, SLOT_LABEL } from "@/lib/subscriptions";
import { cn, formatPrice } from "@/lib/utils";
import type { BillingCycle, MealSlot, TiffinPlan } from "@/types";

type Cycle = Exclude<BillingCycle, "custom">;

/**
 * Plan comparison with live pricing.
 *
 * Billing cycle and meal slot are chosen once at the top and applied across all
 * three cards, so customers compare like with like instead of doing arithmetic
 * in their heads.
 */
export function PlanSelector() {
  const [cycle, setCycle] = React.useState<Cycle>("monthly");
  const [slot, setSlot] = React.useState<MealSlot>("lunch");
  /** The plan whose sign-up dialog is open, if any. */
  const [subscribing, setSubscribing] = React.useState<TiffinPlan | null>(null);

  const bothSlots = slot === "both";

  return (
    <div>
      {/* ---- Cycle + slot controls ---- */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Billing cycle
          </span>
          <Tabs value={cycle} onValueChange={(value) => setCycle(value as Cycle)}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">
                Monthly
                <Badge variant="success" size="sm" className="ml-1">
                  Save up to {maxMonthlyDiscountPercent()}%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Meals per day
          </span>
          <Tabs value={slot} onValueChange={(value) => setSlot(value as MealSlot)}>
            <TabsList>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="dinner">Dinner</TabsTrigger>
              <TabsTrigger value="both">Both</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ---- Plan cards ---- */}
      <Stagger className="mt-12 grid gap-6 lg:grid-cols-3" stagger={0.1}>
        {tiffinPlans.map((plan) => {
          const { meals, total, perMeal } = calculatePlanTotal(plan, cycle, bothSlots);
          const savings = cycle === "monthly" ? monthlySavings(plan) : 0;

          return (
            <StaggerItem key={plan.tier} className="h-full">
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:shadow-float",
                  plan.highlight
                    ? "border-brand-400 shadow-lift ring-2 ring-brand-400/25"
                    : "border-ink-200/70 shadow-soft",
                )}
              >
                {plan.badge && (
                  <span
                    className={cn(
                      "absolute right-5 top-5 z-10 rounded-full px-3 py-1.5 text-[11px] font-bold",
                      plan.highlight
                        ? "bg-brand-500 text-white shadow-soft"
                        : "bg-ink-900/85 text-white backdrop-blur",
                    )}
                  >
                    {plan.badge}
                  </span>
                )}

                <div className="relative aspect-[16/9] overflow-hidden bg-ink-100">
                  <FoodImage
                    imageId={plan.imageId}
                    alt={`${plan.name} tiffin`}
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-display text-2xl text-ink-900">{plan.name}</h3>
                  <p className="mt-1 text-sm font-medium text-brand-600">{plan.headline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-500">
                    {plan.description}
                  </p>

                  {/* Price block */}
                  <div className="mt-6 rounded-2xl bg-ink-50 p-5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-semibold text-ink-900">
                        {formatPrice(perMeal)}
                      </span>
                      <span className="text-sm text-ink-500">/ meal</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-600">
                      {formatPrice(total)} for {meals} meals
                      <span className="text-ink-400">
                        {" "}
                        · billed {cycle === "monthly" ? "monthly" : "weekly"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {SLOT_LABEL[slot]} · {mealsPerDay(slot)}{" "}
                      {mealsPerDay(slot) === 1 ? "meal" : "meals"} a day
                    </p>
                    {savings > 0 && (
                      <p className="mt-1.5 text-xs font-semibold text-fresh-600">
                        You save {formatPrice(savings)} ({monthlyDiscountPercent(plan)}%) vs
                        weekly billing
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 flex flex-col gap-2.5">
                    {plan.includes.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-ink-600">
                        <Check className="mt-0.5 size-4 shrink-0 text-fresh-500" />
                        {line}
                      </li>
                    ))}
                    {plan.excludes?.map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-ink-400">
                        <X className="mt-0.5 size-4 shrink-0 text-ink-300" />
                        {line}
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    variant={plan.highlight ? "primary" : "outline"}
                    className="mt-7 w-full"
                    onClick={() => setSubscribing(plan)}
                  >
                    <Sparkles />
                    Subscribe · {formatPrice(total)}
                  </Button>

                  <p className="mt-3 text-center text-xs text-ink-400">
                    Pause, skip or cancel any time. No lock-in.
                  </p>
                </div>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* One dialog instance, re-keyed per plan so its form state resets. */}
      {subscribing && (
        <SubscribeDialog
          key={`${subscribing.tier}-${cycle}-${slot}`}
          plan={subscribing}
          cycle={cycle}
          slot={slot}
          {...calculatePlanTotal(subscribing, cycle, bothSlots)}
          open
          onOpenChange={(next) => {
            if (!next) setSubscribing(null);
          }}
        />
      )}
    </div>
  );
}
