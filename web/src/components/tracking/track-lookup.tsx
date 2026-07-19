"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2, MessageCircle, Receipt } from "lucide-react";

import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { whatsappLink } from "@/config/site";
import { normaliseOrderNumber } from "@/lib/orders";
import { orderLookupSchema, type OrderLookupValues } from "@/lib/validation";

/**
 * Order lookup.
 *
 * Validation is shape-only and happens here; whether the order actually exists
 * is the detail page's job. Checking existence before navigating would mean two
 * round trips for the common case and would turn this box into an oracle for
 * probing order numbers.
 */
export function TrackLookup() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderLookupValues>({
    resolver: zodResolver(orderLookupSchema),
    mode: "onTouched",
    defaultValues: { orderNumber: "" },
  });

  const onSubmit = (values: OrderLookupValues) => {
    // The schema already upper-cases and trims; normalise again so a manually
    // typed lowercase id still lands on the canonical URL.
    router.push(`/track/${encodeURIComponent(normaliseOrderNumber(values.orderNumber))}`);
  };

  return (
    <div className="mx-auto max-w-xl">
      <Reveal>
        <div className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Receipt className="size-6" aria-hidden />
          </span>

          <h2 className="mt-5 font-display text-2xl text-ink-900">Find your order</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Enter the order ID from your confirmation screen or WhatsApp message. It looks like{" "}
            <span className="font-mono text-ink-700">TSK-2026-00041</span>.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6">
            <Label htmlFor="orderNumber">Order ID</Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id="orderNumber"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="TSK-2026-00041"
                aria-invalid={Boolean(errors.orderNumber)}
                aria-describedby={errors.orderNumber ? "orderNumber-error" : undefined}
                className="flex-1 uppercase tracking-wide"
                {...register("orderNumber")}
              />
              <Button type="submit" size="lg" disabled={isSubmitting} className="sm:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Track
              </Button>
            </div>

            {errors.orderNumber && (
              <p
                id="orderNumber-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs text-destructive"
              >
                <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                {errors.orderNumber.message}
              </p>
            )}
          </form>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center">
          <p className="text-sm font-medium text-ink-800">Lost your order ID?</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">
            It is in the WhatsApp message you sent us. Message the kitchen and we will look it up
            from your phone number.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild variant="accent">
              <a
                href={whatsappLink("Hi! I can't find my order ID — could you look it up?")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp the kitchen
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/menu">Browse the menu</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
