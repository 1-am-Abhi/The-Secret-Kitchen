import { randomInt } from "node:crypto";

/**
 * Human-readable references. Format: PREFIX-YYMMDD-XXXX.
 *
 * The date segment makes support calls easy ("order from the 19th") and the
 * random tail is drawn from a Crockford-style alphabet with I/O/0/1 removed so
 * a reference read out over the phone cannot be transcribed ambiguously.
 * Collisions are handled by the caller retrying against the unique index.
 */

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

export function generateOrderNumber(date = new Date()): string {
  return `TSK-${datePart(date)}-${randomTail(4)}`;
}

export function generateSubscriptionCode(date = new Date()): string {
  return `SUB-${datePart(date)}-${randomTail(4)}`;
}

/**
 * Retries a create that may collide on a unique reference. Four attempts over a
 * 31^4 (~923k) daily key space is far beyond any realistic order volume.
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
