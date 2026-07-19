import { redirect } from "next/navigation";

/**
 * Legacy confirmation route.
 *
 * `/checkout/success` was the old post-order page. Orders placed before the
 * rename may still be linked from a browser history entry, a bookmark or a
 * WhatsApp thread, so it permanently forwards to `/checkout/confirm` with the
 * query string intact — `?order=` is the only thing that page needs.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.set(key, value);
  }

  const suffix = query.toString();
  redirect(suffix ? `/checkout/confirm?${suffix}` : "/checkout/confirm");
}
