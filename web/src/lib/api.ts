/**
 * Thin client for the Express API in ../../server.
 *
 * The storefront is designed to work with or without the backend running: menu
 * content is bundled statically, and write operations (orders, subscriptions,
 * enquiries) degrade gracefully when `NEXT_PUBLIC_API_URL` is unset. That keeps
 * the Vercel deployment independently useful and makes local UI work possible
 * without spinning up Postgres.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when a backend is configured; callers can branch on this for UI copy. */
export const isApiConfigured = Boolean(API_URL);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    // No backend configured — simulate a successful write so the UI flow can be
    // demonstrated end to end. Every such call is logged for visibility.
    console.info(`[api] No NEXT_PUBLIC_API_URL set; skipping ${init?.method ?? "GET"} ${path}`);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true, offline: true } as T;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? `Request failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}

/* ---- Public endpoints ---------------------------------------------------- */

export function subscribeToNewsletter(email: string) {
  return request<{ ok: boolean }>("/newsletter", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function submitContactEnquiry(payload: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}) {
  return request<{ ok: boolean; id?: string }>("/enquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function placeOrder(payload: unknown) {
  return request<{ ok: boolean; orderId: string }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createSubscription(payload: unknown) {
  return request<{ ok: boolean; subscriptionId: string }>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
