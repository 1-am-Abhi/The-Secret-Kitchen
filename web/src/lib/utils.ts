import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names while letting later Tailwind classes win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a rupee amount the way Indian customers expect: ₹1,299 (no paise). */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact rupee label for dense UI such as dashboard tiles: ₹1.2L, ₹12.5K. */
export function formatPriceCompact(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
}

/** URL-safe slug from any human label. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** "12 Aug 2026" — short, unambiguous, locale-stable for Indian users. */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Strip every non-digit so a display number becomes a dialable/wa.me target. */
export function toPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Deterministic pseudo-random number in [0, 1) derived from a string.
 * Used for stable "random-looking" decorative values (rotations, delays) that
 * must not differ between server and client renders — Math.random() would
 * cause hydration mismatches.
 */
export function seededRandom(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Split an array into `columns` round-robin buckets (masonry layout). */
export function distributeIntoColumns<T>(items: T[], columns: number): T[][] {
  const buckets: T[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, index) => buckets[index % columns].push(item));
  return buckets;
}
