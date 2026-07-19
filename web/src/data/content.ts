import { hasFssaiLicense, siteConfig } from "@/config/site";
import { tiffinPlans } from "@/data/tiffin";

/**
 * Brand copy: the promises we make about how we cook, in one place so the same
 * sentence is never written twice.
 *
 * What is deliberately NOT in this file: any claim about what has happened.
 * Meals served, customers, ratings, review counts, delivery averages and
 * milestones are facts recorded in Postgres — read them through
 * `src/lib/storefront-data.ts`. The founder story, team and milestone timeline
 * are admin-authored content blocks for the same reason. Nothing here may be a
 * number about our history, because a file cannot know one.
 */

/** Cheapest advertised tiffin rate, taken from the real plan table. */
const LOWEST_TIFFIN_RATE = Math.min(...tiffinPlans.map((plan) => plan.pricePerMeal.monthly));

/* ==========================================================================
   Why choose us
   ========================================================================== */

export const valueProps = [
  {
    id: "fresh",
    title: "Cooked fresh, twice daily",
    description:
      "Nothing is made the night before. Lunch is cooked between 9 and 11 AM, dinner between 5 and 7 PM — you eat food that is hours old, not days.",
    icon: "Flame",
    stat: "0 hrs",
    statLabel: "reheated food",
  },
  {
    id: "veg",
    title: "100% pure vegetarian",
    description:
      "No meat, fish or egg has ever entered our kitchen. Separate storage, separate oil, separate everything — because shared equipment is not really pure veg.",
    icon: "Leaf",
    stat: "100%",
    statLabel: "shuddh veg",
  },
  {
    id: "hygiene",
    title: "FSSAI licensed & audited",
    description:
      "Deep-cleaned twice a day, temperature-logged at every stage, and staff health checks every quarter. We publish our kitchen photos weekly.",
    icon: "ShieldCheck",
    stat: "2×",
    statLabel: "deep clean daily",
  },
  {
    id: "oil",
    title: "Low oil, never reused",
    description:
      "We cook the way a home kitchen does — measured oil, cold-pressed and branded, discarded after a single service. Your dal will not leave a film on the bowl.",
    icon: "Droplets",
    stat: "1x",
    statLabel: "oil use only",
  },
  {
    id: "delivery",
    title: "Hot in under 45 minutes",
    description:
      "Insulated thermal bags and a tight delivery radius mean your food arrives above 60°C. If it ever arrives cold, it is free.",
    icon: "Timer",
    stat: "<45 min",
    statLabel: "delivery promise",
  },
  {
    id: "value",
    title: "Honest pricing, honest portions",
    description:
      "No surge pricing, no shrinking portions, no photo that looks nothing like what arrives. A tiffin starts at ₹89 and fills you up properly.",
    icon: "IndianRupee",
    stat: `₹${LOWEST_TIFFIN_RATE}`,
    statLabel: "meals from",
  },
];

/* ==========================================================================
   How it works
   ========================================================================== */

export const howItWorks = [
  {
    step: 1,
    title: "Pick your meal",
    description:
      "Browse the homestyle menu or choose a monthly tiffin plan. Filter by category, spice level or protein if you are counting macros.",
    icon: "UtensilsCrossed",
  },
  {
    step: 2,
    title: "Customise it",
    description:
      "Adjust the spice, request Jain preparation, add extra chapatis, or build your own tiffin box component by component with live pricing.",
    icon: "SlidersHorizontal",
  },
  {
    step: 3,
    title: "We cook it fresh",
    description:
      "Your order goes straight to the pass. Gravies are finished to order, chapatis are rolled after you tap pay — nothing sits under a heat lamp.",
    icon: "ChefHat",
  },
  {
    step: 4,
    title: "Hot at your door",
    description:
      "Sealed in insulated packaging and dispatched from your nearest outlet. Track it live and eat within 45 minutes of ordering.",
    icon: "Bike",
  },
];

/* ==========================================================================
   Standing commitments
   These are policies we hold ourselves to, not measurements of what has
   happened — which is why they can honestly live in source control.
   ========================================================================== */

export const missionVision = [
  {
    id: "mission",
    label: "Our Mission",
    title: "Make honest homemade food the easy choice",
    description:
      "To put a genuinely nourishing, freshly cooked vegetarian meal within reach of every student, working professional and family in our city — at a price that does not force a compromise between eating well and eating affordably.",
    icon: "Target",
  },
  {
    id: "vision",
    label: "Our Vision",
    title: "A kitchen you would let your family eat from",
    description:
      "To become North India's most trusted vegetarian cloud kitchen by being radically transparent about what happens behind the pass — our sourcing, our oil, our hygiene, our people — until 'cloud kitchen' stops being a phrase people distrust.",
    icon: "Eye",
  },
];

export const hygienePractices = [
  {
    title: "Twice-daily deep clean",
    description:
      "Every surface, burner and exhaust is scrubbed after lunch and again after dinner service, logged and signed off by the shift lead.",
    icon: "SprayCan",
  },
  {
    title: "Temperature logging",
    description:
      "Cold storage, hot holding and dispatch temperatures are recorded four times a day against HACCP thresholds.",
    icon: "Thermometer",
  },
  {
    title: "Single-use frying oil",
    description:
      "Frying oil is filtered, tested for TPC and discarded after one service. It is never topped up and carried over.",
    icon: "Droplets",
  },
  {
    title: "Quarterly staff health checks",
    description:
      "Every kitchen and delivery team member holds a current medical fitness certificate, renewed every three months.",
    icon: "Stethoscope",
  },
  {
    title: "Colour-coded boards",
    description:
      "Separate boards and knives for raw vegetables, cut fruit, dairy and cooked food eliminate any chance of cross-contamination.",
    icon: "Grid3x3",
  },
  {
    title: "Traceable sourcing",
    description:
      "Every vegetable crate, milk can and oil tin is logged with its supplier and date, so anything can be traced back within minutes.",
    icon: "ScanLine",
  },
];

export const ingredientPromises = [
  {
    title: "Bought fresh each morning",
    description:
      "Vegetables come from the local mandi at 6 AM and are used within 24 hours. Nothing sits in cold storage for a week.",
    icon: "Carrot",
  },
  {
    title: "Paneer set in-house",
    description:
      "We curdle full-cream milk every morning and press our own paneer. It is why it stays soft instead of turning rubbery.",
    icon: "Milk",
  },
  {
    title: "Masalas ground weekly",
    description:
      "Garam masala, chole masala and schezwan paste are ground in small batches every week — never bought pre-mixed in bulk.",
    icon: "Wheat",
  },
  {
    title: "Whole-wheat atta, kneaded daily",
    description:
      "Chakki-fresh atta kneaded twice a day. Dough is never kept overnight, which is exactly why the chapatis stay soft.",
    icon: "CookingPot",
  },
];

/* ==========================================================================
   Trust badges — the compact strip under the hero
   ========================================================================== */

export const trustBadges = [
  { label: "100% Pure Veg", icon: "Leaf" },
  { label: `Free Delivery Above ₹${siteConfig.commerce.freeDeliveryAbove}`, icon: "Truck" },
  { label: "No Reused Oil", icon: "Droplets" },
  { label: "Cancel Anytime", icon: "CalendarCheck" },
  // The FSSAI badge is appended only when a real licence number is configured.
  ...(hasFssaiLicense ? [{ label: "FSSAI Licensed", icon: "BadgeCheck" }] : []),
];
