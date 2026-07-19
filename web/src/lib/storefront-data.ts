/**
 * Server-side reads of live business data.
 *
 * Everything a customer sees that claims to be a fact about this business —
 * how many meals we have served, what people rated us, where we deliver — comes
 * through here, and here reads Postgres via the API. There is no fallback
 * dataset. When the API is unreachable or a table is empty these functions
 * return `null` or an empty array, and callers are expected to render an empty
 * state. A number on this site is either true or absent.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Live figures are cached briefly so the homepage is not a per-request query. */
const STATS_TTL_SECONDS = 300;
const CONTENT_TTL_SECONDS = 300;

/**
 * How long any one of these reads may take before we give up on it.
 *
 * This bound is not optional, because these functions run during static
 * generation and Vercel kills a page that takes longer than 60s to render.
 * `fetch` alone will not save us: Node's implementation has a ~10s *connect*
 * timeout but no *response* timeout, so a backend that accepts the TCP
 * connection and is then slow to answer — exactly what a cold container does —
 * hangs for undici's 300s header timeout. Measured directly: a socket that
 * accepts and never replies leaves `fetch` pending well past 40s with no error
 * to catch. That is what failed the /about and /contact builds.
 *
 * Six seconds is far longer than a warm response (measured at 0.4–2.6s against
 * production) and far shorter than the budget, even if several of these run
 * back to back.
 */
const REQUEST_TIMEOUT_MS = 6_000;

async function get<T>(path: string, revalidate: number): Promise<T | null> {
  if (!API_URL) return null;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    /*
     * A dead backend must degrade to "we cannot say", never to a stale claim.
     *
     * It is logged rather than swallowed silently: the failure mode here is an
     * empty section on a page that still returns 200, which is invisible unless
     * something says so. A build that quietly dropped its statistics should
     * leave a trace in the build log.
     */
    const reason = error instanceof Error ? error.name : "unknown";
    console.warn(`[storefront-data] ${path} unavailable (${reason}); rendering empty state`);
    return null;
  }
}

/* ========================================================================== */
/*  Statistics                                                                */
/* ========================================================================== */

export interface SiteStats {
  mealsServed: number;
  ordersDelivered: number;
  customersServed: number;
  activeSubscribers: number;
  reviewCount: number;
  /** `null` until at least one review exists — an unrated kitchen has no score. */
  averageRating: number | null;
}

export async function getSiteStats(): Promise<SiteStats | null> {
  const payload = await get<{ data: SiteStats }>("/stats", STATS_TTL_SECONDS);
  return payload?.data ?? null;
}

/**
 * Indian digit grouping for a live count. Returns an em dash when the figure is
 * unavailable, which is the only honest thing to print in its place.
 */
export function formatStat(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-IN");
}

/* ========================================================================== */
/*  Reviews                                                                   */
/* ========================================================================== */

export interface PublicReview {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  quote: string;
  initials: string;
  date: string;
  verified: boolean;
}

export interface ReviewFeed {
  reviews: PublicReview[];
  /** `null` when nothing is published — never 0, which would read as a score. */
  average: number | null;
  count: number;
}

/** Published, moderated reviews only. An empty feed is a valid, expected result. */
export async function getPublishedReviews(limit = 12): Promise<ReviewFeed> {
  const payload = await get<{
    data: PublicReview[];
    summary?: { average: number; count: number };
  }>(`/reviews?limit=${limit}`, STATS_TTL_SECONDS);

  const reviews = payload?.data ?? [];
  const count = payload?.summary?.count ?? 0;

  return {
    reviews,
    average: count > 0 ? (payload?.summary?.average ?? null) : null,
    count,
  };
}

/* ========================================================================== */
/*  Outlets & delivery coverage                                               */
/* ========================================================================== */

export interface OutletArea {
  id: string;
  name: string;
  pincode: string;
  etaMinutes: number;
  freeDelivery: boolean;
}

export interface Outlet {
  id: string;
  slug: string;
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  deliveryMinutes?: number;
  opensAt?: string;
  closesAt?: string;
}

export async function getOutlets(): Promise<Outlet[]> {
  const payload = await get<{ data: Outlet[] }>("/outlets", CONTENT_TTL_SECONDS);
  return payload?.data ?? [];
}

/** Every serviceable area across every active outlet, flattened for display. */
export async function getDeliveryAreas(): Promise<(OutletArea & { outletName: string })[]> {
  const payload = await get<{ data: (Outlet & { deliveryAreas: OutletArea[] })[] }>(
    "/outlets",
    CONTENT_TTL_SECONDS,
  );

  return (payload?.data ?? []).flatMap((outlet) =>
    outlet.deliveryAreas.map((area) => ({ ...area, outletName: outlet.name })),
  );
}

/* ========================================================================== */
/*  Editable content blocks                                                   */
/* ========================================================================== */

export interface HeroContent {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  imageId?: string;
}

export type StatMetric = keyof Omit<SiteStats, never>;

export interface StatsContent {
  show: boolean;
  items: { metric: StatMetric; label: string }[];
}

export interface BannersContent {
  items: {
    id: string;
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    tone: "brand" | "fresh" | "ink";
    active: boolean;
  }[];
}

export interface FeaturedContent {
  dishCodes: string[];
  offerCodes: string[];
}

export interface DeliveryInfoContent {
  title?: string;
  description?: string;
  note?: string;
}

export interface StoryContent {
  eyebrow?: string;
  title?: string;
  paragraphs: string[];
  signature?: string;
  signatureRole?: string;
}

export interface MilestonesContent {
  items: { year: string; title: string; description: string }[];
}

export interface TeamContent {
  items: {
    name: string;
    role: string;
    bio?: string;
    experience?: string;
    speciality?: string;
    imageId?: string;
    initials?: string;
  }[];
}

export interface ContentBlockMap {
  "home.hero": HeroContent;
  "home.stats": StatsContent;
  "home.banners": BannersContent;
  "home.featured": FeaturedContent;
  "home.deliveryInfo": DeliveryInfoContent;
  "about.story": StoryContent;
  "about.milestones": MilestonesContent;
  "about.team": TeamContent;
}

/**
 * One admin-authored block, or `null` if nobody has written it. Callers must
 * treat `null` as "render nothing", not "render the old hardcoded copy".
 */
export async function getContentBlock<K extends keyof ContentBlockMap>(
  key: K,
): Promise<ContentBlockMap[K] | null> {
  const payload = await get<{ data: { value: ContentBlockMap[K] } }>(
    `/site-content/${key}`,
    CONTENT_TTL_SECONDS,
  );
  return payload?.data?.value ?? null;
}
