"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { BillBreakdown } from "@/components/cart/cart-view";
import { motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { FoodImage } from "@/components/ui/food-image";
import { Checkbox, Separator } from "@/components/ui/form-controls";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";
import {
  createOrder,
  OrderError,
  saveHandoff,
  type CreateOrderInput,
} from "@/lib/orders";
import { orderCheckoutSchema, type OrderCheckoutValues } from "@/lib/validation";
import { cn, formatPrice } from "@/lib/utils";
import { lineKey, selectTotals, useCartStore } from "@/store/cart-store";

/**
 * Checkout.
 *
 * One short, well-grouped form rather than a wizard: pricing and payment are
 * both settled server-side and over WhatsApp respectively, so there are only
 * seven fields left and a multi-step flow would be ceremony for its own sake.
 *
 * The submit contract is strict and comes from docs/order-flow.md:
 * the order row must be committed by the API *before* anything else happens.
 * We therefore do not clear the cart and do not open WhatsApp here — both
 * belong to the confirmation page, which only renders once `createOrder`
 * resolved. If this request fails the customer keeps their cart and can retry.
 */
export function CheckoutFlow() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);

  // The cart hydrates from localStorage, so the first paint must match the
  // server render.
  React.useEffect(() => setMounted(true), []);

  const totals = selectTotals(lines, couponCode);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<OrderCheckoutValues>({
    resolver: zodResolver(orderCheckoutSchema),
    // onTouched: no red text mid-word, but instant re-validation once someone
    // has seen an error and is fixing it.
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      sameWhatsapp: true,
      whatsappPhone: "",
      addressLine1: "",
      landmark: "",
      pincode: "",
      kitchenNote: "",
    },
  });

  const sameWhatsapp = watch("sameWhatsapp");

  const onSubmit = async (values: OrderCheckoutValues) => {
    const payload: CreateOrderInput = {
      channel: "WHATSAPP",
      customer: {
        name: values.name,
        phone: values.phone,
        whatsappPhone: values.sameWhatsapp ? null : (values.whatsappPhone ?? null),
      },
      address: {
        line1: values.addressLine1,
        landmark: values.landmark || null,
        // The kitchen delivers within one city, so it is not worth a field on
        // the form — but the API contract requires it, so we send the
        // configured city rather than an empty string.
        city: siteConfig.address.city,
        pincode: values.pincode,
      },
      items: lines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        addOnIds: line.addOnIds ?? [],
        note: line.note ?? null,
      })),
      couponCode,
      kitchenNote: values.kitchenNote || null,
    };

    try {
      const order = await createOrder(payload);

      // Hand the WhatsApp URL to the confirmation page through sessionStorage
      // so it can attempt the auto-open on its first paint with no refetch.
      saveHandoff(order);

      router.push(`/checkout/confirm?order=${encodeURIComponent(order.orderNumber)}`);
    } catch (error) {
      // Cart deliberately untouched — nothing was saved, so nothing is lost.
      if (error instanceof OrderError) {
        const actionable =
          error.code === "COUPON_REJECTED" ||
          error.code === "BELOW_MINIMUM_ORDER" ||
          error.code === "ITEM_UNAVAILABLE";

        toast.error(
          error.code === "COUPON_REJECTED"
            ? "That coupon no longer applies"
            : error.code === "BELOW_MINIMUM_ORDER"
              ? "This order is below our minimum"
              : error.code === "ITEM_UNAVAILABLE"
                ? "A dish just became unavailable"
                : "We could not save your order",
          {
            description: error.message,
            duration: actionable ? 10_000 : 7_000,
            action: actionable
              ? { label: "Edit cart", onClick: () => router.push("/cart") }
              : undefined,
          },
        );
        return;
      }

      toast.error("We could not save your order", {
        description:
          "Nothing was charged and your cart is intact. Please try again, or call the kitchen and we will take it over the phone.",
      });
    }
  };

  /** Move focus to the first invalid control so keyboard users are not stranded. */
  const onInvalid = (fieldErrors: FieldErrors<OrderCheckoutValues>) => {
    const first = Object.keys(fieldErrors)[0] as keyof OrderCheckoutValues | undefined;
    if (first) setFocus(first);
  };

  if (!mounted) return <div className="shimmer h-96 rounded-3xl" />;

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-20 text-center sm:px-8">
        <p className="font-display text-2xl text-ink-900">Nothing to check out</p>
        <p className="max-w-sm text-sm text-ink-500">
          Your cart is empty. Add a dish or two and come back.
        </p>
        <Button asChild size="lg">
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7 xl:col-span-8">
        {/* ---- How this works: set expectations before the first field ---- */}
        <div className="flex gap-4 rounded-3xl border border-fresh-200 bg-fresh-50/70 p-5 sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-fresh-500 text-white shadow-soft">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">How this works</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              We save your order first — you will get an order ID straight away. WhatsApp then
              opens with the details filled in, and your order reaches the kitchen the moment you
              press <strong className="font-semibold text-ink-800">Send</strong>.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          noValidate
          className="mt-6 flex flex-col gap-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-soft sm:p-8"
          >
            {/* ---- Contact ---- */}
            <fieldset>
              <legend className="flex items-center gap-2.5 font-display text-xl text-ink-900 sm:text-2xl">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <User className="size-4" aria-hidden />
                </span>
                Who is this order for?
              </legend>

              <div className="mt-6 grid gap-5">
                <Field id="name" label="Full name" error={errors.name?.message} required>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Ananya Sharma"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    {...register("name")}
                  />
                </Field>

                <Field
                  id="phone"
                  label="Phone number"
                  hint="The rider will call this"
                  error={errors.phone?.message}
                  required
                >
                  <PhoneInput
                    id="phone"
                    invalid={Boolean(errors.phone)}
                    describedBy={errors.phone ? "phone-error" : undefined}
                    autoComplete="tel"
                    {...register("phone")}
                  />
                </Field>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 bg-ink-50/50 p-4">
                  <Checkbox
                    checked={sameWhatsapp}
                    onCheckedChange={(checked) =>
                      setValue("sameWhatsapp", checked === true, {
                        shouldValidate: true,
                        shouldTouch: true,
                      })
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink-800">
                      My WhatsApp number is the same
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      Uncheck if the kitchen should message you on a different number.
                    </span>
                  </span>
                </label>

                {!sameWhatsapp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <Field
                      id="whatsappPhone"
                      label="WhatsApp number"
                      error={errors.whatsappPhone?.message}
                      required
                    >
                      <PhoneInput
                        id="whatsappPhone"
                        invalid={Boolean(errors.whatsappPhone)}
                        describedBy={errors.whatsappPhone ? "whatsappPhone-error" : undefined}
                        autoComplete="tel-national"
                        {...register("whatsappPhone")}
                      />
                    </Field>
                  </motion.div>
                )}
              </div>
            </fieldset>

            <Separator className="my-8" />

            {/* ---- Address ---- */}
            <fieldset>
              <legend className="flex items-center gap-2.5 font-display text-xl text-ink-900 sm:text-2xl">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <MapPin className="size-4" aria-hidden />
                </span>
                Where should we deliver?
              </legend>

              <div className="mt-6 grid gap-5">
                <Field
                  id="addressLine1"
                  label="Delivery address"
                  error={errors.addressLine1?.message}
                  required
                >
                  <Textarea
                    id="addressLine1"
                    rows={3}
                    autoComplete="street-address"
                    placeholder="House 24, Near Pillar No. 18, New Atwarpur"
                    aria-invalid={Boolean(errors.addressLine1)}
                    aria-describedby={errors.addressLine1 ? "addressLine1-error" : undefined}
                    className="min-h-24"
                    {...register("addressLine1")}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="landmark"
                    label="Landmark"
                    hint="Optional"
                    error={errors.landmark?.message}
                  >
                    <Input
                      id="landmark"
                      placeholder="Opposite Fortis Hospital"
                      aria-invalid={Boolean(errors.landmark)}
                      aria-describedby={errors.landmark ? "landmark-error" : undefined}
                      {...register("landmark")}
                    />
                  </Field>

                  <Field id="pincode" label="Pincode" error={errors.pincode?.message} required>
                    <Input
                      id="pincode"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      placeholder="804453"
                      aria-invalid={Boolean(errors.pincode)}
                      aria-describedby={errors.pincode ? "pincode-error" : undefined}
                      {...register("pincode")}
                    />
                  </Field>
                </div>
              </div>
            </fieldset>

            <Separator className="my-8" />

            {/* ---- Kitchen note ---- */}
            <Field
              id="kitchenNote"
              label="Notes for the kitchen"
              hint="Optional"
              error={errors.kitchenNote?.message}
            >
              <Textarea
                id="kitchenNote"
                maxLength={300}
                placeholder="Less spicy please, and no coriander on the dal."
                aria-invalid={Boolean(errors.kitchenNote)}
                aria-describedby={errors.kitchenNote ? "kitchenNote-error" : undefined}
                {...register("kitchenNote")}
              />
            </Field>
          </motion.div>

          {/* ---- Actions ---- */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost" size="lg">
              <Link href="/cart">
                <ArrowLeft />
                Back to cart
              </Link>
            </Button>

            <Button type="submit" size="lg" disabled={isSubmitting} className="sm:min-w-64">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving your order…
                </>
              ) : (
                <>
                  <Send />
                  Place order · {formatPrice(totals.total)}
                </>
              )}
            </Button>
          </div>

          {/* Announces the in-flight state to screen readers. */}
          <p aria-live="polite" className="sr-only">
            {isSubmitting ? "Saving your order, please wait." : ""}
          </p>

          <p className="text-xs leading-relaxed text-ink-400">
            The total shown is indicative — the kitchen recalculates it from today&apos;s menu when
            your order is saved, and the confirmed bill appears on the next screen.
          </p>
        </form>
      </div>

      {/* ---- Order summary ---- */}
      <aside className="lg:col-span-5 xl:col-span-4" aria-label="Order summary">
        <div className="sticky top-28 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift">
          <h2 className="font-display text-xl text-ink-900">Order summary</h2>

          <ul className="mt-5 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {lines.map((line) => (
              <li key={lineKey(line)} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  <FoodImage imageId={line.imageId} alt={line.name} sizes="56px" />
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                    {line.quantity}
                  </span>
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-800">
                    {line.name}
                  </span>
                  {"componentLabels" in line && (
                    <span className="block truncate text-[11px] text-ink-400">
                      {line.componentLabels.join(" · ")}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink-900">
                  {formatPrice((line.price + (line.addOnTotal ?? 0)) * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <BillBreakdown totals={totals} couponCode={couponCode} />

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Your order is saved to our kitchen system before WhatsApp opens — nothing gets lost if
            the message does not go through.
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ==========================================================================
   Field primitives
   ========================================================================== */

/** Consistent label + hint + error wrapper for every field. */
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
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** +91 prefixed phone field. Forwards the ref so `register()` still works. */
const PhoneInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { invalid?: boolean; describedBy?: string }
>(({ invalid, describedBy, className, ...props }, ref) => (
  <div className="flex">
    <span
      aria-hidden
      className="flex h-12 items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3.5 text-sm text-ink-500"
    >
      +91
    </span>
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      placeholder="98765 43210"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={cn(
        "h-12 w-full rounded-r-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 transition-all duration-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/12",
        className,
      )}
      {...props}
    />
  </div>
));
PhoneInput.displayName = "PhoneInput";
