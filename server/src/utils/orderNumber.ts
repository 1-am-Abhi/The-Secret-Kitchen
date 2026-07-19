import { randomInt } from "node:crypto";

import type { Prisma } from "@prisma/client";

/**
 * Order and subscription references.
 *
 * Orders use a gapless yearly sequence — `TSK-2026-00041` — because the kitchen
 * reads these aloud over WhatsApp, writes them on packing labels and counts
 * them by hand at end of service. A random reference would be painful to read
 * over a phone line and would make "how many orders so far?" unanswerable at a
 * glance.
 *
 * Subscriptions keep a random reference: they are rare, long-lived, and never
 * counted sequentially.
 */

const ORDER_PREFIX = "TSK";

/** Matches TSK-2026-00041. Exported so API and storefront validate alike. */
export const ORDER_NUMBER_PATTERN = /^TSK-\d{4}-\d{5}$/;

export function formatOrderNumber(year: number, sequence: number): string {
  return `${ORDER_PREFIX}-${year}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Reserves the next order number for `year`.
 *
 * MUST be called inside the same transaction as the order insert. The upsert
 * with an atomic increment takes a row lock on the counter, so concurrent
 * checkouts serialise here and each receives a distinct number. If the
 * surrounding transaction rolls back the increment rolls back with it — which
 * is exactly what keeps the sequence gapless.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const year = now.getFullYear();

  const counter = await tx.orderCounter.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });

  return formatOrderNumber(year, counter.lastValue);
}

/* -------------------------------------------------------------------------- */
/* Subscription references                                                    */
/* -------------------------------------------------------------------------- */

// Crockford-style alphabet: I, O, 0 and 1 removed so a reference read out over
// the phone cannot be transcribed ambiguously.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomTail(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

function datePart(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function generateSubscriptionCode(date = new Date()): string {
  return `SUB-${datePart(date)}-${randomTail(4)}`;
}

/**
 * Retries a create that may collide on a unique reference. Four attempts over a
 * 31^4 (~923k) daily key space is far beyond any realistic volume.
 */
export async function withUniqueReference<T>(
  generate: () => string,
  create: (reference: string) => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await create(generate());
    } catch (error: unknown) {
      const code = (error as { code?: string } | null)?.code;
      // P2002 = unique constraint violation. Anything else is a real failure.
      if (code !== "P2002") throw error;
      lastError = error;
    }
  }
  throw lastError;
}
