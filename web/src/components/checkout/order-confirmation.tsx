"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";

import { motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator, Skeleton } from "@/components/ui/form-controls";
import { siteConfig, telLink, whatsappLink } from "@/config/site";
import {
  buildTrackedWhatsappText,
  isValidOrderNumber,
  markHandoffAttempted,
  normaliseOrderNumber,
  OrderError,
  readHandoff,
  reportHandoffOpened,
  trackOrder,
  wasHandoffAttempted,
  type OrderBill,
  type OrderDelivery,
  type OrderItemLine,
  type OrderStatus,
} from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";

interface ConfirmationView {
  orderNumber: string;
  whatsappUrl: string;
  status: OrderStatus;
  placedAt?: string;
  bill?: OrderBill;
  items?: OrderItemLine[];
  delivery?: OrderDelivery;
}

/**
 * Post-create confirmation.
 *
 * Two things about this page are load-bearing and easy to get wrong:
 *
 * 1. **The cart is cleared here, not at submit.** Emptying it in the checkout
 *    handler would destroy the customer's basket before we know the order row
 *    was committed — a failed request would then lose both the order *and* the
 *    cart. Reaching this page (with a resolvable order) is the first moment we
 *    have proof the database witnessed the order, so it is the first safe
 *    moment to clear.
 *
 * 2. **The scripted WhatsApp open is best-effort only.** `window.open` outside
 *    a user gesture is blocked by essentially every popup blocker, and a
 *    blocked call returns `null` (or throws) rather than reporting failure any
 *    other way. We attempt it exactly once, detect the block, and in all cases
 *    render a real `<a href>` button that cannot be intercepted.
 */
export function OrderConfirmation() {
  const searchParams = useSearchParams();
  const rawOrderNumber = searchParams.get("order") ?? "";
  const orderNumber = normaliseOrderNumber(rawOrderNumber);

  const clearCart = useCartStore((state) => state.clearCart);

  const [view, setView] = React.useState<ConfirmationView | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [autoOpenBlocked, setAutoOpenBlocked] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // React runs effects twice in development StrictMode; these refs keep the
  // one-shot side effects (cart clear, popup attempt) genuinely one-shot.
  const cartClearedRef = React.useRef(false);
  const autoOpenedRef = React.useRef(false);

  /* ---- Resolve the order --------------------------------------------- */
  React.useEffect(() => {
    if (!isValidOrderNumber(orderNumber)) {
      setLoadError("That order link is missing a valid order ID.");
      return;
    }

    let cancelled = false;

    // Fast path: the checkout that just ran stashed the handoff in this tab's
    // sessionStorage, so we can paint (and try to open WhatsApp) immediately.
    const stored = readHandoff(orderNumber);
    if (stored) {
      setView({
        orderNumber: stored.orderNumber,
        whatsappUrl: stored.whatsappUrl,
        status: stored.status,
        placedAt: stored.placedAt,
        bill: stored.bill,
        items: stored.items,
        delivery: stored.delivery,
      });
      return;
    }

    // Slow path: a refresh in a new tab, a shared link, or a cleared session.
    // Rebuild the WhatsApp message from the order the API returns.
    void (async () => {
      try {
        const order = await trackOrder(orderNumber);
        if (cancelled) return;
        setView({
          orderNumber: order.orderNumber,
          whatsappUrl: whatsappLink(buildTrackedWhatsappText(order)),
          status: order.status,
          placedAt: order.placedAt,
          bill: order.bill,
          items: order.items,
          delivery: order.delivery,
        });
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof OrderError
            ? error.message
            : "We could not load that order right now.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  /* ---- Clear the cart, exactly once, only once the order is proven ---- */
  React.useEffect(() => {
    if (!view || cartClearedRef.current) return;
    cartClearedRef.current = true;
    clearCart();
  }, [view, clearCart]);

  /* ---- Best-effort auto-open ------------------------------------------ */
  React.useEffect(() => {
    if (!view || autoOpenedRef.current) return;
    autoOpenedRef.current = true;

    // Once per order, not once per mount — a refresh must not fire a second
    // popup at someone who has already sent or dismissed the message.
    if (wasHandoffAttempted(view.orderNumber)) return;
    markHandoffAttempted(view.orderNumber);

    let opened: Window | null = null;
    try {
      opened = window.open(view.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      opened = null;
    }

    // A blocked popup returns null; some blockers instead hand back a window
    // that is already closed. Either way, fall through to the manual button —
    // this scripted open is a convenience and is never the only path.
    if (!opened || opened.closed) {
      setAutoOpenBlocked(true);
      return;
    }

    reportHandoffOpened(view.orderNumber);
  }, [view]);

  const handleManualOpen = () => {
    if (!view) return;
    markHandoffAttempted(view.orderNumber);
    reportHandoffOpened(view.orderNumber);
  };

  const handleCopy = async () => {
    if (!view) return;
    try {
      await navigator.clipboard.writeText(view.orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions). The ID
      // is selectable text on screen, so there is nothing further to do.
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50/60 p-8 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-2xl text-ink-900">We could not load that order</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">{loadError}</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">
          If you completed checkout, your order is still safe with us — call or WhatsApp the
          kitchen with your order ID and we will pick it up.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild variant="accent" size="lg">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              WhatsApp the kitchen
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={telLink()}>
              <Phone />
              Call the kitchen
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (!view) return <ConfirmationSkeleton />;

  const address = view.delivery
    ? [view.delivery.line1, view.delivery.landmark, view.delivery.city, view.delivery.pincode]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-fresh-500 text-white shadow-[0_16px_48px_-8px_rgb(34_197_94/0.5)]"
      >
        <CircleCheck className="size-10" strokeWidth={2.5} aria-hidden />
      </motion.div>

      <h1 className="mt-8 text-center text-3xl leading-tight text-ink-900 sm:text-5xl">
        Your order has been created.
      </h1>
      <p
        className="mt-4 text-center text-lg leading-relaxed text-ink-600"
        aria-live="polite"
      >
        Please press <strong className="font-semibold text-ink-900">SEND</strong> in WhatsApp to
        confirm your order.
      </p>

      {/* ---- Order ID ---- */}
      <div className="mt-8 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-xs uppercase tracking-[0.14em] text-ink-400">
              Order ID
            </span>
            <span className="mt-1 block break-all font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
              {view.orderNumber}
            </span>
          </div>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy ID"}
          </Button>
          {/* Confirms the copy to screen readers, which cannot see the tick. */}
          <span aria-live="polite" className="sr-only">
            {copied ? "Order ID copied to clipboard" : ""}
          </span>
        </div>

        <Separator className="my-6" />

        {/* ---- The one action that matters ---- */}
        {autoOpenBlocked && (
          <p className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Your browser blocked the WhatsApp window from opening on its own. Tap the button below
            to open it.
          </p>
        )}

        <Button
          asChild
          variant="accent"
          size="xl"
          className="h-16 w-full text-base sm:text-lg"
        >
          <a
            href={view.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleManualOpen}
          >
            <MessageCircle />
            Open WhatsApp &amp; Send
          </a>
        </Button>

        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          Your order is <strong className="font-semibold text-ink-900">saved</strong> — it will not
          be lost. It becomes <strong className="font-semibold text-ink-900">confirmed</strong> only
          once the kitchen receives your WhatsApp message, so please press Send. If WhatsApp will
          not open,{" "}
          <a
            href={telLink()}
            className="font-semibold text-brand-600 underline underline-offset-4 hover:text-brand-700"
          >
            call the kitchen on {siteConfig.contact.phone}
          </a>{" "}
          and read out your order ID instead.
        </p>
      </div>

      {/* ---- Summary ---- */}
      {(view.items?.length || view.bill || address) && (
        <div className="mt-6 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl text-ink-900">Order summary</h2>
            <Badge variant="warning">Awaiting confirmation</Badge>
          </div>

          {view.items && view.items.length > 0 && (
            <ul className="mt-5 flex flex-col gap-3">
              {view.items.map((item, index) => (
                <li
                  key={`${item.itemId}-${index}`}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-800">
                      {item.quantity} × {item.name}
                    </span>
                    {item.addOnLabels?.length ? (
                      <span className="block text-xs text-ink-400">
                        {item.addOnLabels.join(" · ")}
                      </span>
                    ) : null}
                    {item.note ? (
                      <span className="block text-xs italic text-ink-400">{item.note}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold text-ink-900">
                    {formatPrice(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {view.bill && <ServerBill bill={view.bill} />}

          {address && (
            <p className="mt-6 flex items-start gap-2.5 rounded-2xl bg-ink-50 px-4 py-3.5 text-sm leading-relaxed text-ink-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
              <span>
                <span className="block text-xs uppercase tracking-wide text-ink-400">
                  Delivering to
                </span>
                {address}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ---- Next steps ---- */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild variant="secondary" size="lg">
          <Link href={`/track/${encodeURIComponent(view.orderNumber)}`}>
            <Search />
            Track this order
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href={telLink()}>
            <Phone />
            Call the kitchen
          </a>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-ink-400">
        Changed your mind or spotted a mistake?{" "}
        <a
          href={whatsappLink(`Hi! I need to change my order ${view.orderNumber}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 underline underline-offset-4 hover:text-brand-700"
        >
          Message us
        </a>{" "}
        before the kitchen starts cooking and we will sort it out.
      </p>
    </div>
  );
}

/** The server-computed bill. Rows are omitted when the API did not send them. */
function ServerBill({ bill }: { bill: OrderBill }) {
  const rows: { label: string; value: number; tone?: "discount" }[] = [
    { label: "Item total", value: bill.subtotal },
    ...(bill.discount ? [{ label: "Discount", value: -bill.discount, tone: "discount" as const }] : []),
    ...(bill.packagingFee !== undefined ? [{ label: "Packaging", value: bill.packagingFee }] : []),
    ...(bill.deliveryFee !== undefined ? [{ label: "Delivery", value: bill.deliveryFee }] : []),
    ...(bill.gst !== undefined ? [{ label: "GST", value: bill.gst }] : []),
  ];

  return (
    <dl className="mt-5 flex flex-col gap-2.5 border-t border-ink-100 pt-5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between text-ink-500">
          <dt>{row.label}</dt>
          <dd className={row.tone === "discount" ? "font-medium text-fresh-600" : "text-ink-700"}>
            {row.value < 0 ? `−${formatPrice(Math.abs(row.value))}` : formatPrice(row.value)}
          </dd>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t border-ink-100 pt-4">
        <dt className="font-semibold text-ink-900">Total</dt>
        <dd className="font-display text-2xl font-semibold text-ink-900">
          {formatPrice(bill.total)}
        </dd>
      </div>
    </dl>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-10 w-4/5" />
      <Skeleton className="h-6 w-3/5" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <Skeleton className="h-48 w-full rounded-3xl" />
      <span className="sr-only" aria-live="polite">
        Loading your order confirmation
      </span>
    </div>
  );
}
