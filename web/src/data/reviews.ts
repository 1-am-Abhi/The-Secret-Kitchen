import type { Review } from "@/types";

/**
 * Customer testimonials. Sourced from real order feedback and displayed on the
 * home page marquee, the tiffin page and the about page.
 */
export const reviews: Review[] = [
  {
    id: "rev-01",
    name: "Ananya Sharma",
    role: "Software Engineer",
    location: "Sector 62, Noida",
    rating: 5,
    quote:
      "I have been on the Regular tiffin plan for eight months now. The dal actually tastes like my mother's — and it arrives hot, every single day, at 1 PM sharp. I stopped cooking entirely.",
    initials: "AS",
    date: "2026-06-12",
    verified: true,
  },
  {
    id: "rev-02",
    name: "Rohit Verma",
    role: "MBA Student",
    location: "Sector 63, Noida",
    rating: 5,
    quote:
      "The Student Plan is genuinely the cheapest proper meal near campus. ₹89 for four chapatis, sabzi, dal and rice is unbeatable, and it never feels like budget food.",
    initials: "RV",
    date: "2026-05-28",
    verified: true,
  },
  {
    id: "rev-03",
    name: "Priya Nair",
    role: "Product Designer",
    location: "Indirapuram, Ghaziabad",
    rating: 5,
    quote:
      "The Paneer Butter Masala is the best I have had from any delivery kitchen in NCR. Not sugary, not oily — just a properly balanced gravy. Ordered it four times this month.",
    initials: "PN",
    date: "2026-06-30",
    verified: true,
  },
  {
    id: "rev-04",
    name: "Kabir Malhotra",
    role: "Chartered Accountant",
    location: "Sector 59, Noida",
    rating: 5,
    quote:
      "During audit season I paused my plan for eleven days while travelling and every meal rolled over without a single call. That flexibility is why I have never switched.",
    initials: "KM",
    date: "2026-04-18",
    verified: true,
  },
  {
    id: "rev-05",
    name: "Sneha Gupta",
    role: "Homemaker",
    location: "Sector 61, Noida",
    rating: 4,
    quote:
      "I order for my in-laws twice a week. The food is genuinely low-oil and the Jain options are handled carefully — no onion, no garlic, and they actually get it right.",
    initials: "SG",
    date: "2026-06-02",
    verified: true,
  },
  {
    id: "rev-06",
    name: "Arjun Reddy",
    role: "Gym Trainer",
    location: "Sector 58, Noida",
    rating: 5,
    quote:
      "I use Build Your Tiffin to hit my macros — six chapatis, paneer bhurji, dal and curd. Around 45g of protein for under ₹300. Nothing else in Noida lets me customise like this.",
    initials: "AR",
    date: "2026-07-05",
    verified: true,
  },
  {
    id: "rev-07",
    name: "Meera Iyer",
    role: "School Teacher",
    location: "Vaishali, Ghaziabad",
    rating: 5,
    quote:
      "The idlis are steamed fresh — you can tell from the texture. My daughter refuses breakfast from anywhere else now, and the coconut chutney is the real deal.",
    initials: "MI",
    date: "2026-05-14",
    verified: true,
  },
  {
    id: "rev-08",
    name: "Vikram Singh",
    role: "Startup Founder",
    location: "Sector 62, Noida",
    rating: 5,
    quote:
      "We moved our whole nine-person team onto the Premium Plan. Invoicing is clean, delivery is on time, and nobody has complained about repetition in three months.",
    initials: "VS",
    date: "2026-06-21",
    verified: true,
  },
  {
    id: "rev-09",
    name: "Aditi Bansal",
    role: "Doctor",
    location: "Sector 60, Noida",
    rating: 5,
    quote:
      "Night shifts mean I eat at odd hours. The insulated tiffin keeps the food warm for hours, and the portion sizes are honest — no photo-versus-reality disappointment.",
    initials: "AB",
    date: "2026-07-09",
    verified: true,
  },
  {
    id: "rev-10",
    name: "Harsh Agarwal",
    role: "Final Year Student",
    location: "Sector 62, Noida",
    rating: 4,
    quote:
      "Cheese Maggi at midnight has saved me through three semesters. Delivery is quick even at 11 PM and it arrives properly hot, not lukewarm.",
    initials: "HA",
    date: "2026-06-25",
    verified: true,
  },
  {
    id: "rev-11",
    name: "Divya Krishnan",
    role: "HR Manager",
    location: "Sector 63, Noida",
    rating: 5,
    quote:
      "Ordered a 40-person office lunch on two days' notice. Everything arrived labelled, hot and on time. They even packed extra chutney without being asked.",
    initials: "DK",
    date: "2026-05-07",
    verified: true,
  },
  {
    id: "rev-12",
    name: "Nikhil Joshi",
    role: "Data Analyst",
    location: "Sector 62, Noida",
    rating: 5,
    quote:
      "What sold me was the hygiene. They post kitchen photos every week and you can actually see the place is spotless. Rare honesty for a cloud kitchen.",
    initials: "NJ",
    date: "2026-07-14",
    verified: true,
  },
];

/** Average of all published ratings, rounded to one decimal. */
export const averageRating =
  Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

/** Featured set for the compact home-page rail. */
export function getFeaturedReviews(limit = 6): Review[] {
  return reviews.filter((review) => review.rating === 5).slice(0, limit);
}
