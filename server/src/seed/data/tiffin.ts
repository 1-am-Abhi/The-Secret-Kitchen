import type { TiffinPlan } from "./types";

/** Tiffin plan catalogue, ported verbatim from web/src/data/tiffin.ts. */
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
