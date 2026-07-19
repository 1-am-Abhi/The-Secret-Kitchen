import type { DeliveryArea } from "@/types";

/**
 * Marketing and brand copy. Kept out of components so the same sentence is
 * never written twice and non-developers can edit wording in one place.
 */

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
    stat: "A+",
    statLabel: "hygiene rating",
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
    stat: "32 min",
    statLabel: "average delivery",
  },
  {
    id: "value",
    title: "Honest pricing, honest portions",
    description:
      "No surge pricing, no shrinking portions, no photo that looks nothing like what arrives. A tiffin starts at ₹89 and fills you up properly.",
    icon: "IndianRupee",
    stat: "₹89",
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
      "Browse 55+ homestyle dishes or choose a monthly tiffin plan. Filter by category, spice level or protein if you are counting macros.",
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
      "Sealed in insulated packaging and dispatched within our 6 km radius. Track it live and eat within 45 minutes of ordering.",
    icon: "Bike",
  },
];

/* ==========================================================================
   About page
   ========================================================================== */

export const brandStory = {
  eyebrow: "Our Story",
  title: "It started with one hungry hostel floor",
  paragraphs: [
    "In 2019, Meenakshi Rawat was cooking dinner for her son and his four flatmates in a Sector 62 apartment. Word travelled down the hostel corridor, and within a month she was packing eighteen tiffins a night from a single domestic kitchen.",
    "She never intended to start a restaurant. What she noticed was simpler and sadder: young people living away from home were eating food that filled them up but never actually nourished them. Reheated gravies, reused oil, portions that shrank whenever demand grew.",
    "The Secret Kitchen exists to fix exactly that. We cook the way a mother cooks — measured oil, fresh vegetables bought that morning, dal that has actually been simmered rather than pressure-blasted. The only secret is that there is no secret. Just care, repeated daily.",
    "Six years on we serve over 1,200 tiffin subscribers and deliver across Noida and Ghaziabad. Meenakshi still tastes the dal before every dinner dispatch.",
  ],
  signature: "Meenakshi Rawat",
  signatureRole: "Founder & Head Chef",
};

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

export const chefTeam = [
  {
    name: "Meenakshi Rawat",
    role: "Founder & Head Chef",
    bio: "Started the kitchen from her own home in 2019. Specialises in the slow-cooked Punjabi gravies the menu is built around.",
    experience: "25 years",
    speciality: "North Indian gravies",
    imageId: "team-1",
    initials: "MR",
  },
  {
    name: "Suresh Pillai",
    role: "South Indian Chef",
    bio: "Trained in Kochi and Chennai. Ferments our idli batter overnight and grinds the chutneys fresh every single morning.",
    experience: "18 years",
    speciality: "Idli, dosa & chutneys",
    imageId: "team-2",
    initials: "SP",
  },
  {
    name: "Aarti Deshmukh",
    role: "Continental & Chinese Chef",
    bio: "Runs the pasta and Indo-Chinese section. Her pink sauce recipe took eleven attempts before it made the menu.",
    experience: "12 years",
    speciality: "Pasta & Indo-Chinese",
    imageId: "team-3",
    initials: "AD",
  },
  {
    name: "Imran Qureshi",
    role: "Kitchen Operations Lead",
    bio: "Owns hygiene, sourcing and dispatch timing. Every temperature log and supplier invoice passes across his desk.",
    experience: "15 years",
    speciality: "Food safety & logistics",
    imageId: "team-4",
    initials: "IQ",
  },
];

export const milestones = [
  { year: "2019", title: "Eighteen tiffins a night", description: "Started from a home kitchen in Sector 62 with one cook and one scooter." },
  { year: "2021", title: "First commercial kitchen", description: "Moved into a licensed 1,200 sq ft kitchen and crossed 200 daily orders." },
  { year: "2023", title: "Tiffin subscriptions launch", description: "Introduced monthly plans with pause, skip and rollover — 400 subscribers in the first quarter." },
  { year: "2024", title: "1,00,000 meals served", description: "Crossed a hundred thousand cumulative meals and expanded into Ghaziabad." },
  { year: "2026", title: "1,200+ active subscribers", description: "Serving Noida and Ghaziabad daily with a 4.8 average rating across 2,100+ reviews." },
];

/* ==========================================================================
   Delivery coverage
   ========================================================================== */

export const deliveryAreas: DeliveryArea[] = [
  { name: "Sector 62, Noida", pincode: "201309", etaMinutes: 25, freeDelivery: true },
  { name: "Sector 63, Noida", pincode: "201301", etaMinutes: 28, freeDelivery: true },
  { name: "Sector 58, Noida", pincode: "201301", etaMinutes: 30, freeDelivery: true },
  { name: "Sector 59, Noida", pincode: "201301", etaMinutes: 32, freeDelivery: true },
  { name: "Sector 60, Noida", pincode: "201301", etaMinutes: 30, freeDelivery: true },
  { name: "Sector 61, Noida", pincode: "201301", etaMinutes: 27, freeDelivery: true },
  { name: "Sector 71, Noida", pincode: "201301", etaMinutes: 38, freeDelivery: false },
  { name: "Noida Extension", pincode: "201306", etaMinutes: 42, freeDelivery: false },
  { name: "Indirapuram", pincode: "201014", etaMinutes: 40, freeDelivery: false },
  { name: "Vaishali", pincode: "201010", etaMinutes: 45, freeDelivery: false },
  { name: "Vasundhara", pincode: "201012", etaMinutes: 44, freeDelivery: false },
  { name: "Crossings Republik", pincode: "201016", etaMinutes: 48, freeDelivery: false },
];

/**
 * Pincode lookup for the coverage checker. Matches on pincode or on a
 * case-insensitive substring of the area name so "sector 62" also resolves.
 */
export function findDeliveryArea(query: string): DeliveryArea | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return deliveryAreas.find(
    (area) =>
      area.pincode === needle || area.name.toLowerCase().includes(needle),
  );
}

/* ==========================================================================
   Trust badges — the compact strip under the hero
   ========================================================================== */

export const trustBadges = [
  { label: "FSSAI Licensed", icon: "BadgeCheck" },
  { label: "100% Pure Veg", icon: "Leaf" },
  { label: "Free Delivery Above ₹349", icon: "Truck" },
  { label: "No Reused Oil", icon: "Droplets" },
  { label: "Cancel Anytime", icon: "CalendarCheck" },
];
