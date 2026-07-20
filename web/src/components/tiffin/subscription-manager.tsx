"use client";

import * as React from "react";
import {
  CalendarCheck,
  CalendarX,
  Flame,
  HeartPulse,
  Package,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/form-controls";
import { subscriptionControls, tiffinFeatures } from "@/data/tiffin";
import { cn, formatDate } from "@/lib/utils";
import type { Subscription } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  PauseCircle,
  PlayCircle,
  CalendarX,
  SlidersHorizontal,
  Flame,
  Package,
  RefreshCw,
  HeartPulse,
};

/**
 * A demo of the subscriber dashboard.
 *
 * Showing the pause / resume / skip controls working — rather than just
 * describing them — is the most persuasive answer to "what if I travel?", the
 * single biggest objection to committing to a monthly plan.
 *
 * State is local: once a customer account exists this becomes a thin wrapper
 * over PATCH /api/subscriptions/:id.
 */
const DEMO_SUBSCRIPTION: Subscription = {
  id: "sub-demo",
  planTier: "regular",
  cycle: "monthly",
  slot: "lunch",
  status: "active",
  startDate: "2026-07-01",
  nextDeliveryDate: "2026-07-20",
  mealsRemaining: 18,
  skippedDates: [],
  addressLabel: "Home · New Atwarpur, Patna",
};

const TOTAL_MEALS = 26;

export function SubscriptionManager() {
  const [subscription, setSubscription] = React.useState(DEMO_SUBSCRIPTION);

  const isPaused = subscription.status === "paused";

  const togglePause = () => {
    setSubscription((current) => ({
      ...current,
      status: current.status === "paused" ? "active" : "paused",
    }));
    toast.success(isPaused ? "Subscription resumed" : "Subscription paused", {
      description: isPaused
        ? "Your next tiffin arrives tomorrow at your usual slot."
        : "Remaining meals roll over — nothing expires while you're away.",
    });
  };

  const skipNext = () => {
    setSubscription((current) => ({
      ...current,
      skippedDates: [...current.skippedDates, current.nextDeliveryDate],
      mealsRemaining: current.mealsRemaining,
    }));
    toast.success("Tomorrow's meal skipped", {
      description: "It has been credited back to your plan balance.",
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* ---- Live demo card ---- */}
      <div className="lg:col-span-5">
        <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-lift">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50 px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Subscriber dashboard
            </span>
            <Badge variant={isPaused ? "warning" : "success"} size="sm">
              {isPaused ? "Paused" : "Active"}
            </Badge>
          </div>

          <div className="p-6">
            <p className="font-display text-2xl text-ink-900">Regular Plan</p>
            <p className="mt-1 text-sm text-ink-500">
              Lunch · Monthly billing · {subscription.addressLabel}
            </p>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-500">Meals remaining</span>
                <span className="font-semibold text-ink-900">
                  {subscription.mealsRemaining} of {TOTAL_MEALS}
                </span>
              </div>
              <Progress
                value={(subscription.mealsRemaining / TOTAL_MEALS) * 100}
                className="mt-2"
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ink-50 p-4">
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                  Next delivery
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink-800">
                  {isPaused ? "Paused" : formatDate(subscription.nextDeliveryDate)}
                </dd>
              </div>
              <div className="rounded-2xl bg-ink-50 p-4">
                <dt className="text-[11px] uppercase tracking-wide text-ink-400">
                  Meals skipped
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink-800">
                  {subscription.skippedDates.length}
                </dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button
                variant={isPaused ? "accent" : "outline"}
                onClick={togglePause}
                className="w-full"
              >
                {isPaused ? <PlayCircle /> : <PauseCircle />}
                {isPaused ? "Resume plan" : "Pause plan"}
              </Button>
              <Button
                variant="outline"
                onClick={skipNext}
                disabled={isPaused}
                className="w-full"
              >
                <CalendarX />
                Skip next meal
              </Button>
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-fresh-50 px-4 py-3 text-xs text-fresh-700">
              <CalendarCheck className="mt-0.5 size-3.5 shrink-0" />
              This is a live preview — try the buttons. Real subscribers get this
              dashboard the moment their plan starts.
            </p>
          </div>
        </div>
      </div>

      {/* ---- Controls & features ---- */}
      <div className="lg:col-span-7">
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {subscriptionControls.map((control) => {
            const Icon = ICONS[control.icon] ?? PauseCircle;
            return (
              <StaggerItem key={control.id} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-ink-200/70 bg-white p-5 transition-shadow duration-300 hover:shadow-soft">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg text-ink-900">
                    {control.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    {control.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Stagger className="mt-4 grid gap-3 sm:grid-cols-2" delay={0.1}>
          {tiffinFeatures.map((feature) => {
            const Icon = ICONS[feature.icon] ?? Flame;
            return (
              <StaggerItem key={feature.title}>
                <div
                  className={cn(
                    "flex h-full items-start gap-3 rounded-2xl bg-ink-50 p-4",
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-fresh-600" />
                  <span>
                    <span className="block text-sm font-semibold text-ink-800">
                      {feature.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {feature.description}
                    </span>
                  </span>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
