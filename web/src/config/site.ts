/**
 * Single source of truth for business identity, contact channels and
 * operational rules. Every value here is overridable via environment variables
 * so the same build can be re-pointed at a different outlet without a code
 * change. Update `.env` on deploy — never hardcode in components.
 */

const env = process.env;

export const siteConfig = {
  name: "The Secret Kitchen",
  shortName: "Secret Kitchen",
  tagline: "Homemade Happiness, Delivered Fresh.",
  description:
    "The Secret Kitchen is a pure-veg cloud kitchen and monthly tiffin service serving freshly cooked homestyle meals — North Indian thalis, pasta, maggi, paratha, rice bowls and desserts — delivered hot to your door.",

  url: env.NEXT_PUBLIC_SITE_URL || "https://thesecretkitchen.in",

  contact: {
    phone: env.NEXT_PUBLIC_PHONE || "+91 98765 43210",
    whatsapp: env.NEXT_PUBLIC_WHATSAPP || "+91 98765 43210",
    email: env.NEXT_PUBLIC_EMAIL || "hello@thesecretkitchen.in",
    supportEmail: "support@thesecretkitchen.in",
  },

  address: {
    line1: "Shop 14, Ground Floor, Sunrise Plaza",
    line2: "Sector 62, Noida",
    city: "Noida",
    state: "Uttar Pradesh",
    postalCode: "201309",
    country: "IN",
    /** Used for the maps embed and the LocalBusiness JSON-LD geo block. */
    latitude: 28.6272,
    longitude: 77.3716,
  },

  /** Kitchen service windows. `open`/`close` are 24h "HH:MM" for JSON-LD. */
  hours: {
    weekday: { label: "Monday – Friday", open: "08:00", close: "23:00" },
    weekend: { label: "Saturday – Sunday", open: "08:30", close: "23:30" },
    display: "8:00 AM – 11:00 PM, all days",
    note: "Lunch tiffins dispatch 12:00 – 1:30 PM · Dinner tiffins 7:30 – 9:00 PM",
  },

  social: {
    instagram: "https://instagram.com/thesecretkitchen",
    facebook: "https://facebook.com/thesecretkitchen",
    x: "https://x.com/secretkitchen",
    youtube: "https://youtube.com/@thesecretkitchen",
  },

  /** Order economics — referenced by cart, checkout and the delivery banner. */
  commerce: {
    currency: "INR",
    deliveryFee: 29,
    freeDeliveryAbove: 349,
    packagingFee: 15,
    gstRate: 0.05,
    minimumOrder: 99,
    averagePrepMinutes: 28,
  },

  /** Social proof numbers surfaced in the hero and about page. */
  stats: {
    mealsServed: "1,20,000+",
    happyCustomers: "8,500+",
    tiffinSubscribers: "1,200+",
    rating: 4.8,
    reviewCount: 2143,
    yearsRunning: 6,
  },

  fssaiLicense: "12722016000456",
  foundedYear: 2019,
} as const;

export type SiteConfig = typeof siteConfig;

/** Full postal address on one line — footer, contact card, structured data. */
export const fullAddress = [
  siteConfig.address.line1,
  siteConfig.address.line2,
  `${siteConfig.address.state} ${siteConfig.address.postalCode}`,
].join(", ");

/** Pre-filled WhatsApp deep link. Pass a message to seed the conversation. */
export function whatsappLink(
  message = `Hi ${siteConfig.name}! I'd like to place an order.`,
): string {
  const digits = siteConfig.contact.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** `tel:` link with all formatting stripped. */
export function telLink(): string {
  return `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`;
}

/** Keyless Google Maps embed — no API key or billing account required. */
export function mapsEmbedUrl(): string {
  const query = encodeURIComponent(`${siteConfig.name}, ${fullAddress}`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

/** Opens turn-by-turn directions in the user's default maps app. */
export function mapsDirectionsUrl(): string {
  const { latitude, longitude } = siteConfig.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
