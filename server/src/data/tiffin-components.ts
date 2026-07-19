/**
 * Build-Your-Tiffin component catalogue.
 *
 * Ported verbatim from web/src/data/tiffin.ts. Custom tiffin boxes are priced
 * on the server from THIS list, never from the price the client sends, so a
 * tampered cart cannot buy a paneer box for the price of a chapati.
 */

export type TiffinComponentGroup =
  | "chapati"
  | "rice"
  | "dal"
  | "sabzi"
  | "paneer"
  | "sweet"
  | "salad";

export interface TiffinComponent {
  id: string;
  group: TiffinComponentGroup;
  label: string;
  description: string;
  price: number;
  calories: number;
  protein: number;
  default?: boolean;
}

export interface TiffinComponentGroupMeta {
  group: TiffinComponentGroup;
  label: string;
  description: string;
  icon: string;
  /** Minimum selections required before the tiffin can be added to cart. */
  min: number;
  max: number;
}

export const componentGroups: TiffinComponentGroupMeta[] = [
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

export const componentById = new Map(tiffinComponents.map((component) => [component.id, component]));

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
  labels: string[];
}

/**
 * Price a custom tiffin. Bigger boxes get a progressively better rate, which
 * both rewards larger orders and keeps the builder feeling generous. Mirrors
 * web/src/data/tiffin.ts::summariseBuild exactly.
 */
export function summariseBuild(selectedIds: string[]): TiffinBuildSummary {
  const selected = selectedIds
    .map((id) => componentById.get(id))
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
    labels: selected.map((component) => component.label),
  };
}

/** Validates group min/max rules; returns human-readable problems for the UI. */
export function validateBuild(selectedIds: string[]): string[] {
  const problems: string[] = [];
  for (const meta of componentGroups) {
    const count = selectedIds.filter((id) => componentById.get(id)?.group === meta.group).length;
    if (count < meta.min) {
      problems.push(`Pick at least ${meta.min} ${meta.label.toLowerCase()} option`);
    }
    if (count > meta.max) {
      problems.push(`You can pick at most ${meta.max} ${meta.label.toLowerCase()} options`);
    }
  }
  return problems;
}
