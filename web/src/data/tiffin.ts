import type {
  BillingCycle,
  TiffinComponent,
  TiffinComponentGroup,
  TiffinPlan,
  WeeklyMenuDay,
} from "@/types";

/**
 * Monthly tiffin subscription catalogue: plan tiers, the published sample
 * weekly menu, and the component library behind the Build Your Tiffin builder.
 */

export const tiffinPlans: TiffinPlan[] = [
  {
    tier: "student",
    name: "Student Plan",
    headline: "Ghar ka khana on a hostel budget",
    description:
      "Built for students and first-jobbers living away from home. A complete, filling meal that costs less than a canteen thali — with the nutrition your mother would approve of.",
    pricePerMeal: { monthly: 89, weekly: 99 },
    mealsPerCycle: { monthly: 26, weekly: 6 },
    includes: [
      "4 phulka chapatis (whole wheat)",
      "1 seasonal sabzi (180g)",
      "Dal of the day (200g)",
      "Steamed rice (150g)",
      "Pickle & salad on the side",
    ],
    excludes: ["Paneer dishes", "Weekend sweet"],
    badge: "Most affordable",
    imageId: "tiffin-student",
  },
  {
    tier: "regular",
    name: "Regular Plan",
    headline: "The everyday family favourite",
    description:
      "Our most-subscribed plan. A properly balanced meal with a bigger portion, two sabzis twice a week, and paneer on Wednesdays and Sundays.",
    pricePerMeal: { monthly: 129, weekly: 145 },
    mealsPerCycle: { monthly: 26, weekly: 6 },
    includes: [
      "5 chapatis or 4 chapati + 1 paratha",
      "2 sabzis (200g each)",
      "Dal or rajma/chole (250g)",
      "Jeera rice (200g)",
      "Paneer dish twice a week",
      "Curd, salad, pickle & papad",
    ],
    highlight: true,
    badge: "Most popular",
    imageId: "tiffin-regular",
  },
  {
    tier: "premium",
    name: "Premium Plan",
    headline: "Restaurant quality, delivered daily",
    description:
      "For those who want variety without compromise. Paneer or a special gravy every single day, a dessert on alternate days, and first pick of the weekly menu poll.",
    pricePerMeal: { monthly: 179, weekly: 199 },
    mealsPerCycle: { monthly: 26, weekly: 6 },
    includes: [
      "6 chapatis, paratha or butter naan",
      "2 premium sabzis including paneer daily",
      "Dal makhani or speciality dal",
      "Pulao or jeera rice (250g)",
      "Dessert on alternate days",
      "Raita, salad, pickle & papad",
      "Priority delivery slot",
      "Free menu customisation",
    ],
    badge: "Best value per gram",
    imageId: "tiffin-premium",
  },
];

export const planByTier = new Map(tiffinPlans.map((plan) => [plan.tier, plan]));

/** Discount applied when a customer commits to a full month instead of a week. */
export const CYCLE_DISCOUNT_LABEL: Record<Exclude<BillingCycle, "custom">, string> = {
  weekly: "Try it out",
  monthly: `Save up to ${maxMonthlyDiscountPercent()}%`,
};

/**
 * The real monthly saving for one plan, as a whole percentage off the weekly
 * per-meal rate.
 *
 * Computed rather than written down: the badge previously claimed a flat 12%
 * while the actual figures were 10-11%, which is precisely the sort of number
 * that drifts the moment someone edits a price.
 */
export function monthlyDiscountPercent(plan: TiffinPlan): number {
  const { weekly, monthly } = plan.pricePerMeal;
  if (weekly <= 0) return 0;
  return Math.round((1 - monthly / weekly) * 100);
}

/** Best monthly saving across all plans — what "save up to X%" may claim. */
export function maxMonthlyDiscountPercent(): number {
  return Math.max(...tiffinPlans.map(monthlyDiscountPercent));
}

/**
 * Total for one billing period. Monthly plans bill 26 meals (Mon-Sat over four
 * weeks); choosing both lunch and dinner doubles the meal count.
 */
export function calculatePlanTotal(
  plan: TiffinPlan,
  cycle: Exclude<BillingCycle, "custom">,
  bothSlots: boolean,
): { meals: number; total: number; perMeal: number } {
  const meals = plan.mealsPerCycle[cycle] * (bothSlots ? 2 : 1);
  const perMeal = plan.pricePerMeal[cycle];
  return { meals, total: meals * perMeal, perMeal };
}

/** Rupees saved per period by choosing monthly over weekly billing. */
export function monthlySavings(plan: TiffinPlan): number {
  const weeklyRate = plan.pricePerMeal.weekly * plan.mealsPerCycle.monthly;
  const monthlyRate = plan.pricePerMeal.monthly * plan.mealsPerCycle.monthly;
  return weeklyRate - monthlyRate;
}

/* ==========================================================================
   Sample weekly menu — published so subscribers always know what is coming.
   ========================================================================== */

export const weeklyMenu: WeeklyMenuDay[] = [
  {
    day: "Monday",
    lunch: ["Dal Tadka", "Aloo Jeera", "4 Chapati", "Jeera Rice", "Salad"],
    dinner: ["Mix Veg", "Dal Fry", "4 Chapati", "Steamed Rice", "Curd"],
  },
  {
    day: "Tuesday",
    lunch: ["Rajma", "Bhindi Masala", "4 Chapati", "Steamed Rice", "Pickle"],
    dinner: ["Kadhi Pakoda", "Aloo Gobhi", "4 Chapati", "Jeera Rice", "Salad"],
  },
  {
    day: "Wednesday",
    lunch: ["Shahi Paneer", "Dal Tadka", "4 Chapati", "Veg Pulao", "Raita"],
    dinner: ["Chole", "Aloo Matar", "4 Chapati", "Steamed Rice", "Salad"],
    sweet: "Gulab Jamun",
  },
  {
    day: "Thursday",
    lunch: ["Dal Makhani", "Lauki Kofta", "4 Chapati", "Jeera Rice", "Curd"],
    dinner: ["Mix Veg", "Moong Dal", "4 Chapati", "Steamed Rice", "Pickle"],
  },
  {
    day: "Friday",
    lunch: ["Kadai Paneer", "Dal Fry", "4 Chapati", "Veg Fried Rice", "Salad"],
    dinner: ["Chana Masala", "Sarson Aloo", "4 Chapati", "Jeera Rice", "Raita"],
  },
  {
    day: "Saturday",
    lunch: ["Paneer Butter Masala", "Dal Tadka", "2 Chapati + Naan", "Veg Pulao", "Raita"],
    dinner: ["Rajma", "Seasonal Sabzi", "4 Chapati", "Steamed Rice", "Salad"],
    sweet: "Rasmalai",
  },
  {
    day: "Sunday",
    lunch: ["Palak Paneer", "Dal Makhani", "Aloo Paratha", "Paneer Pulao", "Boondi Raita"],
    dinner: ["Chef's Special Thali", "Seasonal Sabzi", "4 Chapati", "Jeera Rice", "Salad"],
    sweet: "Brownie",
  },
];

/* ==========================================================================
   Build Your Tiffin
   ========================================================================== */

export const componentGroups: {
  group: TiffinComponentGroup;
  label: string;
  description: string;
  icon: string;
  /** Minimum selections required before the tiffin can be added to cart. */
  min: number;
  max: number;
}[] = [
  {
    group: "chapati",
    label: "Chapati",
    description: "Hand-rolled whole wheat, straight off the tawa",
    icon: "CookingPot",
    min: 1,
    max: 1,
  },
  {
    group: "rice",
    label: "Rice",
    description: "Aged basmati, steamed grain-separate",
    icon: "Wheat",
    min: 0,
    max: 1,
  },
  {
    group: "dal",
    label: "Dal",
    description: "Slow-simmered and tempered fresh",
    icon: "Soup",
    min: 1,
    max: 1,
  },
  {
    group: "sabzi",
    label: "Sabzi",
    description: "Seasonal vegetables, cooked to order",
    icon: "Carrot",
    min: 1,
    max: 2,
  },
  {
    group: "paneer",
    label: "Paneer",
    description: "Set fresh every morning in our kitchen",
    icon: "ChefHat",
    min: 0,
    max: 1,
  },
  {
    group: "sweet",
    label: "Sweet",
    description: "House-made, never store-bought",
    icon: "IceCreamCone",
    min: 0,
    max: 1,
  },
  {
    group: "salad",
    label: "Salad & Sides",
    description: "Crisp, fresh and cut on the spot",
    icon: "Salad",
    min: 0,
    max: 2,
  },
];

export const tiffinComponents: TiffinComponent[] = [
  // Chapati
  { id: "cha-2", group: "chapati", label: "2 Chapati", description: "Light portion", price: 24, calories: 220, protein: 6, default: true },
  { id: "cha-4", group: "chapati", label: "4 Chapati", description: "Standard portion", price: 44, calories: 440, protein: 12 },
  { id: "cha-6", group: "chapati", label: "6 Chapati", description: "Hearty portion", price: 62, calories: 660, protein: 18 },
  { id: "cha-par", group: "chapati", label: "2 Ghee Paratha", description: "Layered and crisp", price: 58, calories: 480, protein: 10 },

  // Rice
  { id: "ric-plain", group: "rice", label: "Steamed Rice", description: "200g basmati", price: 45, calories: 260, protein: 5, default: true },
  { id: "ric-jeera", group: "rice", label: "Jeera Rice", description: "Ghee-tempered cumin", price: 60, calories: 300, protein: 6 },
  { id: "ric-pulao", group: "rice", label: "Veg Pulao", description: "Whole spices and vegetables", price: 80, calories: 380, protein: 9 },

  // Dal
  { id: "dal-tadka", group: "dal", label: "Dal Tadka", description: "Arhar dal, ghee tadka", price: 55, calories: 220, protein: 12, default: true },
  { id: "dal-fry", group: "dal", label: "Dal Fry", description: "Mixed lentils, onion-tomato", price: 55, calories: 230, protein: 12 },
  { id: "dal-makhani", group: "dal", label: "Dal Makhani", description: "Twelve-hour black urad", price: 85, calories: 340, protein: 14 },
  { id: "dal-rajma", group: "dal", label: "Rajma", description: "Jammu kidney beans", price: 75, calories: 280, protein: 15 },
  { id: "dal-chole", group: "dal", label: "Chole", description: "Kabuli chana, house masala", price: 75, calories: 290, protein: 14 },

  // Sabzi
  { id: "sab-aloo", group: "sabzi", label: "Aloo Jeera", description: "Cumin-tossed potato", price: 50, calories: 210, protein: 4, default: true },
  { id: "sab-bhindi", group: "sabzi", label: "Bhindi Masala", description: "Crisp, never slimy", price: 65, calories: 180, protein: 5 },
  { id: "sab-mixveg", group: "sabzi", label: "Mix Veg", description: "Seven seasonal vegetables", price: 65, calories: 190, protein: 6 },
  { id: "sab-gobhi", group: "sabzi", label: "Aloo Gobhi", description: "Dry roasted with ajwain", price: 60, calories: 200, protein: 5 },
  { id: "sab-lauki", group: "sabzi", label: "Lauki Chana", description: "Light and easy to digest", price: 55, calories: 160, protein: 6 },

  // Paneer
  { id: "pan-butter", group: "paneer", label: "Paneer Butter Masala", description: "Silky tomato gravy", price: 120, calories: 380, protein: 20 },
  { id: "pan-kadai", group: "paneer", label: "Kadai Paneer", description: "Wok-tossed, coriander forward", price: 115, calories: 340, protein: 20 },
  { id: "pan-palak", group: "paneer", label: "Palak Paneer", description: "Iron-rich and light", price: 110, calories: 300, protein: 19 },
  { id: "pan-bhurji", group: "paneer", label: "Paneer Bhurji", description: "Scrambled with capsicum", price: 105, calories: 320, protein: 22 },

  // Sweet
  { id: "swe-gulab", group: "sweet", label: "Gulab Jamun", description: "2 pieces in rose syrup", price: 45, calories: 300, protein: 4 },
  { id: "swe-ras", group: "sweet", label: "Rasmalai", description: "2 pieces, saffron milk", price: 60, calories: 260, protein: 8 },
  { id: "swe-kheer", group: "sweet", label: "Rice Kheer", description: "Slow-reduced with cardamom", price: 50, calories: 240, protein: 6 },
  { id: "swe-halwa", group: "sweet", label: "Gajar Halwa", description: "Winter special, ghee-roasted", price: 65, calories: 320, protein: 5 },

  // Salad & sides
  { id: "sal-green", group: "salad", label: "Green Salad", description: "Cucumber, tomato, onion, lemon", price: 30, calories: 60, protein: 2, default: true },
  { id: "sal-raita", group: "salad", label: "Boondi Raita", description: "Whisked curd, roasted jeera", price: 35, calories: 120, protein: 5 },
  { id: "sal-curd", group: "salad", label: "Fresh Curd", description: "Set in-house daily, 150g", price: 25, calories: 100, protein: 6 },
  { id: "sal-papad", group: "salad", label: "Roasted Papad", description: "2 pieces, flame-roasted", price: 20, calories: 70, protein: 2 },
];

export const componentsByGroup = componentGroups.map((meta) => ({
  ...meta,
  options: tiffinComponents.filter((component) => component.group === meta.group),
}));

/** Bulk discount tiers — the more you build in, the cheaper each rupee gets. */
const BUILDER_DISCOUNT_TIERS = [
  { threshold: 400, rate: 0.12 },
  { threshold: 300, rate: 0.08 },
  { threshold: 200, rate: 0.05 },
];

export interface TiffinBuildSummary {
  subtotal: number;
  discount: number;
  total: number;
  discountRate: number;
  calories: number;
  protein: number;
  itemCount: number;
}

/**
 * Price a custom tiffin. Bigger boxes get a progressively better rate, which
 * both rewards larger orders and keeps the builder feeling generous.
 */
export function summariseBuild(selectedIds: string[]): TiffinBuildSummary {
  const selected = selectedIds
    .map((id) => tiffinComponents.find((component) => component.id === id))
    .filter((component): component is TiffinComponent => Boolean(component));

  const subtotal = selected.reduce((sum, component) => sum + component.price, 0);
  const tier = BUILDER_DISCOUNT_TIERS.find((t) => subtotal >= t.threshold);
  const discountRate = tier?.rate ?? 0;
  const discount = Math.round(subtotal * discountRate);

  return {
    subtotal,
    discount,
    total: subtotal - discount,
    discountRate,
    calories: selected.reduce((sum, component) => sum + component.calories, 0),
    protein: selected.reduce((sum, component) => sum + component.protein, 0),
    itemCount: selected.length,
  };
}

/** The preselected box shown when the builder first mounts. */
export function defaultBuildSelection(): string[] {
  return tiffinComponents.filter((component) => component.default).map((c) => c.id);
}

/** Validates group min/max rules; returns human-readable problems for the UI. */
export function validateBuild(selectedIds: string[]): string[] {
  const problems: string[] = [];
  for (const meta of componentGroups) {
    const count = selectedIds.filter(
      (id) => tiffinComponents.find((c) => c.id === id)?.group === meta.group,
    ).length;
    if (count < meta.min) {
      problems.push(`Pick at least ${meta.min} ${meta.label.toLowerCase()} option`);
    }
    if (count > meta.max) {
      problems.push(`You can pick at most ${meta.max} ${meta.label.toLowerCase()} options`);
    }
  }
  return problems;
}

/* ==========================================================================
   Subscription management copy — drives the pause/resume/skip panel.
   ========================================================================== */

export const subscriptionControls = [
  {
    id: "pause",
    title: "Pause anytime",
    description:
      "Travelling for a week? Pause your plan from the dashboard and your remaining meals roll over. No expiry, no penalty.",
    icon: "PauseCircle",
  },
  {
    id: "resume",
    title: "Resume in one tap",
    description:
      "Back home? Hit resume before 9 PM and your tiffin is at your door the very next day.",
    icon: "PlayCircle",
  },
  {
    id: "skip",
    title: "Skip a single meal",
    description:
      "Eating out tonight? Skip that one delivery up to 4 hours in advance and it is credited straight back to your plan.",
    icon: "CalendarX",
  },
  {
    id: "customise",
    title: "Customise your box",
    description:
      "Allergic to something, or want extra chapatis on gym days? Set preferences once and every future tiffin follows them.",
    icon: "SlidersHorizontal",
  },
];

export const tiffinFeatures = [
  {
    title: "Freshly cooked, never reheated",
    description:
      "Every tiffin is cooked in the two hours before dispatch. Nothing is made the night before.",
    icon: "Flame",
  },
  {
    title: "Insulated, leak-proof boxes",
    description:
      "Food-grade steel tiffins in insulated sleeves keep your dal above 60°C for up to three hours.",
    icon: "Package",
  },
  {
    title: "Rotating 28-day menu",
    description:
      "No dish repeats within the same fortnight, so the plan never gets boring by week three.",
    icon: "RefreshCw",
  },
  {
    title: "Nutritionist-balanced",
    description:
      "Every meal is planned to land between 550-750 kcal with at least 20g of protein.",
    icon: "HeartPulse",
  },
];
