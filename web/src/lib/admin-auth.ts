/**
 * Admin authentication API.
 *
 * This is the auth half of the *same* backend client as `admin-orders.ts` — it
 * reads the same `NEXT_PUBLIC_API_URL` and writes/reads the same single token
 * key through the helpers exported there. It lives in its own module only
 * because `adminRequest()` in `admin-orders.ts` refuses to run without a token,
 * which is precisely the situation `POST /auth/login` exists to resolve.
 *
 *   POST /api/auth/login   { email, password }
 *        200 -> { token, admin: { id, email, name, role } }   (no data envelope)
 *        401 -> { message, code }
 *        429 -> rate limited after repeated failures
 *   GET  /api/auth/me      Authorization: Bearer <token>
 *        200 -> { admin: { ... } }
 *        401 -> token missing, malformed or expired
 *
 * Same rule as the orders client: never throw into render. Every call resolves
 * to a discriminated result so the login screen and the route guard can render
 * an honest message instead of tripping an error boundary.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

/** The signed-in admin, as the panel needs it. */
export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Why an auth call could not succeed.
 *
 * `credentials` and `rate-limited` are separated deliberately: telling someone
 * their password is wrong when the server actually stopped answering would send
 * them round the same failing loop.
 */
export type AdminAuthFailureReason =
  | "offline"
  | "credentials"
  | "rate-limited"
  | "unauthorized"
  | "network"
  | "server"
  | "invalid";

export interface AdminAuthFailure {
  ok: false;
  reason: AdminAuthFailureReason;
  message: string;
  status?: number;
}

export type AdminLoginResult =
  | { ok: true; token: string; admin: AdminIdentity }
  | AdminAuthFailure;

export type AdminMeResult = { ok: true; admin: AdminIdentity } | AdminAuthFailure;

function fail(
  reason: AdminAuthFailureReason,
  message: string,
  status?: number,
): AdminAuthFailure {
  return { ok: false, reason, message, status };
}

/* ========================================================================== */
/*  Normalisation                                                             */
/* ========================================================================== */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** `null` when the payload is not recognisably an admin, so callers can say so. */
function normalizeIdentity(raw: unknown): AdminIdentity | null {
  const admin = asRecord(raw);
  const email = str(admin.email);
  if (!email) return null;
  return {
    id: str(admin.id, email),
    email,
    name: str(admin.name, email),
    role: str(admin.role, "ADMIN"),
  };
}

/** "KITCHEN_MANAGER" -> "Kitchen manager". Roles are screaming snake on the wire. */
export function formatAdminRole(role: string): string {
  const words = role.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!words) return "Admin";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "Kitchen Admin" -> "KA". Used by the account avatar. */
export function adminInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/* ========================================================================== */
/*  Endpoints                                                                 */
/* ========================================================================== */

const NOT_CONFIGURED =
  "This deployment has no admin API configured, so sign-in is unavailable.";

/**
 * How long to wait for the auth API before giving up.
 *
 * `fetch` in a browser has NO default timeout. A backend that accepts the TCP
 * connection and is then slow to answer — a container waking from idle, which
 * is exactly what Railway does after a quiet period — leaves the request
 * pending indefinitely, so the button sits on "Signing in…" with nothing to
 * report either way.
 *
 * 20s is deliberately generous: a cold start is worth waiting through, and the
 * alternative is telling someone their credentials failed when the server was
 * merely asleep. A warm sign-in returns in well under a second.
 */
const AUTH_TIMEOUT_MS = 20_000;

/**
 * The caller's own cancellation combined with our timeout.
 *
 * `AbortSignal.any` is recent enough that it is worth degrading gracefully:
 * where it is missing we keep the caller's signal and simply go without the
 * timeout, which is no worse than the behaviour this replaces.
 */
function withTimeout(signal: AbortSignal | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== "function") return signal;
  const timeout = AbortSignal.timeout(AUTH_TIMEOUT_MS);
  if (!signal) return timeout;
  if (typeof AbortSignal.any !== "function") return signal;
  return AbortSignal.any([signal, timeout]);
}

/**
 * Turn a thrown `fetch` into something a person can act on.
 *
 * Every failure mode below arrives here as the same opaque TypeError — a CORS
 * rejection, a DNS failure, an https page blocked from calling an http API, a
 * backend that never answered. The browser deliberately withholds which, so
 * this cannot diagnose; what it can do is stop claiming "check your
 * connection", which sends people to inspect the one thing that is usually
 * fine, and name the timeout case where we do know.
 */
function describeFetchFailure(error: unknown, callerAborted: boolean, what: string): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `The server did not respond within ${AUTH_TIMEOUT_MS / 1000} seconds. It may be waking up — please try again.`;
  }
  if (error instanceof DOMException && error.name === "AbortError" && !callerAborted) {
    return `The server did not respond within ${AUTH_TIMEOUT_MS / 1000} seconds. It may be waking up — please try again.`;
  }
  return `Could not reach ${what}. This is usually the server being unreachable or refusing this site's origin — check the browser console for the exact network error.`;
}

/**
 * Exchange credentials for a bearer token.
 *
 * Does NOT store the token — the caller decides that, so a component can log
 * the attempt or redirect before anything is persisted.
 */
export async function loginAdmin(
  email: string,
  password: string,
  signal?: AbortSignal,
): Promise<AdminLoginResult> {
  if (!API_URL) return fail("offline", NOT_CONFIGURED);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      signal: withTimeout(signal),
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    // Only the caller's own signal means "cancelled"; our timeout aborts too.
    if (signal?.aborted) return fail("invalid", "Sign-in was cancelled.");
    return fail("network", describeFetchFailure(error, false, "the server"));
  }

  const payload: unknown = await response.json().catch(() => null);
  const body = asRecord(payload);

  if (response.status === 429) {
    return fail(
      "rate-limited",
      str(
        body.message,
        "Too many sign-in attempts. Wait a few minutes before trying again.",
      ),
      429,
    );
  }

  if (response.status === 401 || response.status === 403) {
    return fail(
      "credentials",
      str(body.message, "Incorrect email or password."),
      response.status,
    );
  }

  if (!response.ok) {
    return fail(
      response.status >= 500 ? "server" : "invalid",
      str(body.message, `Sign-in failed (${response.status}).`),
      response.status,
    );
  }

  // Top-level `token` and `admin` — this endpoint is not wrapped in a `data`
  // envelope, unlike the /admin/* resources.
  const token = str(body.token);
  const admin = normalizeIdentity(body.admin);
  if (!token || !admin) {
    return fail("invalid", "The server returned an unexpected sign-in response.");
  }

  return { ok: true, token, admin };
}

/** Validate a stored token and read back the admin it belongs to. */
export async function fetchCurrentAdmin(
  token: string,
  signal?: AbortSignal,
): Promise<AdminMeResult> {
  if (!API_URL) return fail("offline", NOT_CONFIGURED);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/me`, {
      signal: withTimeout(signal),
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (signal?.aborted) return fail("invalid", "Request cancelled.");
    return fail("network", describeFetchFailure(error, false, "the admin API"));
  }

  if (response.status === 401 || response.status === 403) {
    return fail("unauthorized", "This session has expired.", response.status);
  }

  const payload: unknown = await response.json().catch(() => null);
  const body = asRecord(payload);

  if (!response.ok) {
    return fail(
      response.status >= 500 ? "server" : "invalid",
      str(body.message, `Session check failed (${response.status}).`),
      response.status,
    );
  }

  // Accept both `{ admin }` (what the server sends) and a bare admin object, so
  // a future envelope change degrades to one reload rather than a lockout.
  const admin = normalizeIdentity(body.admin ?? body.data ?? body);
  if (!admin) return fail("invalid", "The server returned an unexpected session response.");

  return { ok: true, admin };
}
