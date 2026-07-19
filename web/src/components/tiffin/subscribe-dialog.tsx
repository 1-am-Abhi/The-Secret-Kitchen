"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Check, Copy, Loader2, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig, telLink } from "@/config/site";
import {
  clearSubscriptionHandoff,
  createSubscription,
  CYCLE_LABEL,
  saveSubscriptionHandoff,
  SLOT_LABEL,
  SubscriptionError,
  type CreatedSubscription,
} from "@/lib/subscriptions";
import {
  subscriptionCheckoutSchema,
  type SubscriptionCheckoutValues,
} from "@/lib/validation";
import { formatPrice } from "@/lib/utils";
import type { BillingCycle, MealSlot, TiffinPlan } from "@/types";

/**
 * Subscription sign-up.
 *
 * Follows the same contract as the food order flow (docs/order-flow.md): the
 * subscription row is committed to Postgres FIRST, and only then does WhatsApp
 * open. If the customer never presses Send the subscription still exists,
 * awaiting confirmation, rather than vanishing.
 *
 * The chosen billing cycle and meal slot are passed straight through to the
 * API, which re-prices the period server-side — the totals shown here are for
 * the customer's benefit and are never trusted as input.
 */
export function SubscribeDialog({
  plan,
  cycle,
  slot,
  meals,
  total,
  perMeal,
  open,
  onOpenChange,
}: {
  plan: TiffinPlan;
  cycle: Exclude<BillingCycle, "custom">;
  slot: MealSlot;
  meals: number;
  total: number;
  perMeal: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [created, setCreated] = React.useState<CreatedSubscription | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionCheckoutValues>({
    resolver: zodResolver(subscriptionCheckoutSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      addressLine1: "",
      landmark: "",
      pincode: "",
      preferences: "",
    },
  });

  // Reset back to the form whenever the dialog is reopened, so a previous
  // confirmation is never mistaken for a new one.
  React.useEffect(() => {
    if (open) {
      setCreated(null);
      setCopied(false);
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: SubscriptionCheckoutValues) => {
    try {
      const subscription = await createSubscription({
        customer: { name: values.name, phone: values.phone },
        address: {
          line1: values.addressLine1,
          landmark: values.landmark || null,
          // Single-city kitchen: not worth a field, but the API requires it.
          city: siteConfig.address.city,
          pincode: values.pincode,
        },
        planTier: plan.tier,
        cycle,
        slot,
        preferences: values.preferences || null,
      });

      saveSubscriptionHandoff(subscription);
      setCreated(subscription);
    } catch (error) {
      const message =
        error instanceof SubscriptionError
          ? error.message
          : "Something went wrong. Please try again, or call the kitchen.";
      toast.error("We could not start that subscription", { description: message });
    }
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the code is selectable on screen regardless.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {created ? (
          /* ---------------- Confirmation ---------------- */
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-fresh-500 text-white">
                <Check className="size-7" strokeWidth={2.5} />
              </span>
              <DialogTitle className="mt-5">Your subscription has been created</DialogTitle>
              <DialogDescription className="mt-2">
                Press <strong className="font-semibold text-ink-700">Send</strong> in WhatsApp to
                confirm it with the kitchen.
              </DialogDescription>
            </div>

            <div className="mt-6 rounded-2xl bg-ink-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-ink-400">Subscription ID</p>
              <button
                onClick={handleCopy}
                className="mt-1 inline-flex items-center gap-2 font-display text-2xl font-semibold text-ink-900"
              >
                {created.code}
                {copied ? (
                  <Check className="size-4 text-fresh-600" />
                ) : (
                  <Copy className="size-4 text-ink-400" />
                )}
              </button>
            </div>

            <dl className="mt-5 flex flex-col gap-2 text-sm">
              <Row label="Plan" value={created.planName} />
              <Row label="Billing cycle" value={CYCLE_LABEL[cycle]} />
              <Row label="Meals per day" value={SLOT_LABEL[slot]} />
              <Row label="Meals in period" value={String(created.mealsTotal)} />
              <Row
                label="Total"
                value={formatPrice(created.amount)}
                emphasis
              />
              <Row label="Starts" value={created.startDate} />
            </dl>

            <div className="mt-6 grid gap-2">
              <Button asChild size="lg">
                <a
                  href={created.handoff.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => clearSubscriptionHandoff(created.code)}
                >
                  <MessageCircle />
                  Open WhatsApp &amp; Send
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href={telLink()}>
                  <Phone />
                  Or call the kitchen instead
                </a>
              </Button>
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-ink-400">
              Your subscription is saved. It becomes active once the kitchen confirms it.
            </p>
          </div>
        ) : (
          /* ---------------- Sign-up form ---------------- */
          <>
            <DialogHeader>
              <DialogTitle>Subscribe to {plan.name}</DialogTitle>
              <DialogDescription>
                {CYCLE_LABEL[cycle]} billing · {SLOT_LABEL[slot]} · {meals} meals ·{" "}
                {formatPrice(perMeal)} per meal
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-6 pb-6">
              <div className="rounded-2xl bg-brand-50 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-brand-700">Total for this period</span>
                  <span className="font-display text-2xl font-semibold text-ink-900">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <Field id="sub-name" label="Full name" error={errors.name?.message} required>
                  <Input
                    id="sub-name"
                    autoComplete="name"
                    placeholder="Ananya Sharma"
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                </Field>

                <Field id="sub-phone" label="Mobile number" error={errors.phone?.message} required>
                  <div className="flex">
                    <span className="flex h-12 items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-500">
                      +91
                    </span>
                    <Input
                      id="sub-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      aria-invalid={Boolean(errors.phone)}
                      className="rounded-l-none"
                      {...register("phone")}
                    />
                  </div>
                </Field>

                <Field
                  id="sub-address"
                  label="Delivery address"
                  error={errors.addressLine1?.message}
                  required
                >
                  <Input
                    id="sub-address"
                    autoComplete="address-line1"
                    placeholder="B-402, Sunrise Residency, Sector 62"
                    aria-invalid={Boolean(errors.addressLine1)}
                    {...register("addressLine1")}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="sub-landmark" label="Landmark" hint="Optional">
                    <Input
                      id="sub-landmark"
                      placeholder="Opposite Fortis"
                      {...register("landmark")}
                    />
                  </Field>
                  <Field id="sub-pincode" label="Pincode" error={errors.pincode?.message} required>
                    <Input
                      id="sub-pincode"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      placeholder="201309"
                      aria-invalid={Boolean(errors.pincode)}
                      {...register("pincode")}
                    />
                  </Field>
                </div>

                <Field
                  id="sub-prefs"
                  label="Preferences for the kitchen"
                  hint="Optional"
                  error={errors.preferences?.message}
                >
                  <Textarea
                    id="sub-prefs"
                    placeholder="No onion or garlic, extra chapatis on gym days…"
                    maxLength={500}
                    className="min-h-20"
                    {...register("preferences")}
                  />
                </Field>
              </div>

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Creating subscription…
                  </>
                ) : (
                  <>
                    <CalendarCheck />
                    Create subscription · {formatPrice(total)}
                  </>
                )}
              </Button>

              <p className="mt-3 text-center text-xs leading-relaxed text-ink-400">
                We save your subscription first, then WhatsApp opens so you can confirm it.
                Pause, skip or cancel any time.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={emphasis ? "font-semibold text-ink-900" : "text-ink-800"}>{value}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
