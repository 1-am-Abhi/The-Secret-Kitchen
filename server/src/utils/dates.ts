/**
 * Subscription date maths.
 *
 * Deliveries are date-only concepts: "your tiffin arrives on the 21st" must not
 * shift when the server runs in UTC and the customer reads it in IST. Every
 * helper here normalises to midnight UTC and treats a date as an opaque
 * calendar day, which is also what Prisma's `@db.Date` columns store.
 */

const DAY_MS = 86_400_000;

/** Strips the time component, pinning the value to 00:00:00 UTC. */
export function toDateOnly(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

export function formatDateOnly(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10);
}

/**
 * Tiffins run Monday to Saturday — the kitchen does not dispatch subscription
 * boxes on Sundays. A Sunday delivery date therefore always rolls to Monday.
 */
export function isDeliveryDay(date: Date): boolean {
  return toDateOnly(date).getUTCDay() !== 0;
}

/**
 * The next date the customer should actually receive a box: the first
 * delivery day strictly after `from` that they have not skipped. The bounded
 * loop (two weeks) stops a pathological skip list from spinning forever.
 */
export function nextDeliveryDate(from: Date, skipped: Date[] = []): Date {
  const skippedKeys = new Set(skipped.map((date) => formatDateOnly(date)));
  let candidate = addDays(toDateOnly(from), 1);

  for (let guard = 0; guard < 14; guard += 1) {
    if (isDeliveryDay(candidate) && !skippedKeys.has(formatDateOnly(candidate))) return candidate;
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/**
 * When a subscription resumes, delivery restarts from the next delivery day —
 * never retroactively, because the kitchen cannot cook for a day that has
 * already passed. Paused meals are not lost: `mealsRemaining` is untouched by
 * pausing, so the balance simply rolls forward.
 */
export function resumeDate(from = new Date(), skipped: Date[] = []): Date {
  return nextDeliveryDate(from, skipped);
}

/**
 * Projected end of a billing period: `meals` delivery days after the start,
 * skipping Sundays. Used for the dashboard's "runs until" line, so it must
 * count actual dispatch days rather than naive calendar days.
 */
export function projectEndDate(start: Date, meals: number, slot: "LUNCH" | "DINNER" | "BOTH"): Date {
  // Two boxes a day means the same calendar run covers twice the meals.
  const deliveriesNeeded = Math.ceil(meals / (slot === "BOTH" ? 2 : 1));
  let cursor = toDateOnly(start);
  let counted = isDeliveryDay(cursor) ? 1 : 0;

  while (counted < deliveriesNeeded) {
    cursor = addDays(cursor, 1);
    if (isDeliveryDay(cursor)) counted += 1;
  }
  return cursor;
}

/** Inclusive list of the last `days` calendar days, oldest first. */
export function lastNDays(days: number, end = new Date()): Date[] {
  const last = toDateOnly(end);
  return Array.from({ length: days }, (_, index) => addDays(last, index - (days - 1)));
}
