"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bike, ChefHat, CheckCircle2, MessageCircle, Phone, Receipt } from "lucide-react";

import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { siteConfig, telLink, whatsappLink } from "@/config/site";

const TIMELINE = [
  {
    icon: Receipt,
    title: "Order received",
    description: "We have your order and payment is confirmed.",
    done: true,
  },
  {
    icon: ChefHat,
    title: "In the kitchen",
    description: "Your gravies are being finished and chapatis rolled fresh.",
    done: false,
  },
  {
    icon: Bike,
    title: "Out for delivery",
    description: "Sealed in an insulated bag and on its way to you.",
    done: false,
  },
  {
    icon: CheckCircle2,
    title: "Delivered",
    description: "Hot at your door. Enjoy!",
    done: false,
  },
];

/**
 * Order confirmation.
 *
 * The order reference comes through the query string rather than state so the
 * page survives a refresh or being shared — a customer who reloads should not
 * lose their reference number.
 */
export function OrderConfirmation() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "TSK00000000";

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-fresh-500 text-white shadow-[0_16px_48px_-8px_rgb(34_197_94/0.5)]"
      >
        <CheckCircle2 className="size-10" strokeWidth={2.5} />
      </motion.div>

      <h1 className="mt-8 text-center text-4xl leading-tight text-ink-900 sm:text-5xl">
        Order confirmed!
      </h1>
      <p className="mt-4 text-center text-lg text-ink-500">
        Thank you — our chefs are already on it. You&apos;ll get a WhatsApp
        update at every step.
      </p>

      <div className="mt-8 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-5">
          <span>
            <span className="block text-xs uppercase tracking-wide text-ink-400">
              Order reference
            </span>
            <span className="mt-0.5 block font-display text-2xl font-semibold text-ink-900">
              {orderId}
            </span>
          </span>
          <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            Arriving in ~{siteConfig.commerce.averagePrepMinutes + 15} minutes
          </span>
        </div>

        <ol className="mt-6 flex flex-col gap-5">
          {TIMELINE.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <li key={entry.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      entry.done
                        ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-fresh-500 text-white"
                        : "flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  {index < TIMELINE.length - 1 && (
                    <span aria-hidden className="mt-1 h-full w-px flex-1 bg-ink-200" />
                  )}
                </div>
                <div className="pb-1">
                  <p className={entry.done ? "font-semibold text-ink-900" : "font-medium text-ink-600"}>
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">{entry.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild variant="accent" size="lg">
          <a
            href={whatsappLink(`Hi! I'd like an update on order ${orderId}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Track on WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={telLink()}>
            <Phone />
            Call the kitchen
          </a>
        </Button>
      </div>

      <div className="mt-8 rounded-3xl bg-ink-50 p-6 text-center">
        <p className="font-display text-xl text-ink-900">Eat like this every day?</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Our monthly tiffin plans start at ₹89 a meal — cooked fresh, delivered
          daily, and you can pause any time.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/tiffin">See tiffin plans</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/menu">Order something else</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
