import type {
  BillingCycle,
  DishTag,
  FaqCategory,
  GalleryAspect,
  GalleryCategory,
  MealSlot,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PlanTier,
  Prisma,
  SpiceLevel,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { addDays, projectEndDate, toDateOnly } from "../utils/dates";
import { calculateBill } from "../utils/pricing";
import { faqs } from "./data/faq";
import { galleryRows } from "./data/gallery";
import { categories, menuItems } from "./data/menu";
import { offers } from "./data/offers";
import { tiffinPlans } from "./data/tiffin";

/**
 * Idempotent seed. Every write is an upsert keyed on a stable business key
 * (slug / code / email), so running it against an already-populated database
 * refreshes content instead of duplicating it — which is what makes it safe to
 * wire into a deploy hook.
 */

/* --- enum translation: storefront kebab-case → Postgres SCREAMING_SNAKE ---- */

const SPICE: Record<string, SpiceLevel> = {
  mild: "MILD",
  medium: "MEDIUM",
  spicy: "SPICY",
};

const TAG: Record<string, DishTag> = {
  bestseller: "BESTSELLER",
  new: "NEW",
  "chef-special": "CHEF_SPECIAL",
  healthy: "HEALTHY",
  "high-protein": "HIGH_PROTEIN",
  "jain-available": "JAIN_AVAILABLE",
  "kids-favourite": "KIDS_FAVOURITE",
  value: "VALUE",
};

const FAQ_CATEGORY: Record<string, FaqCategory> = {
  ordering: "ORDERING",
  delivery: "DELIVERY",
  tiffin: "TIFFIN",
  food: "FOOD",
  payments: "PAYMENTS",
};

const GALLERY_CATEGORY: Record<string, GalleryCategory> = {
  dishes: "DISHES",
  kitchen: "KITCHEN",
  team: "TEAM",
  packaging: "PACKAGING",
  moments: "MOMENTS",
};

const GALLERY_ASPECT: Record<string, GalleryAspect> = {
  portrait: "PORTRAIT",
  landscape: "LANDSCAPE",
  square: "SQUARE",
};

const PLAN_TIER: Record<string, PlanTier> = {
  student: "STUDENT",
  regular: "REGULAR",
  premium: "PREMIUM",
};

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`  ${message}`);
}

/* -------------------------------------------------------------------------- */

async function seedCategories(): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>();

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        tagline: category.tagline,
        icon: category.icon,
        sortOrder: category.order,
        active: true,
      },
      create: {
        slug: category.slug,
        name: category.name,
        tagline: category.tagline,
        icon: category.icon,
        sortOrder: category.order,
      },
    });
    idBySlug.set(category.slug, row.id);
  }

  log(`categories: ${idBySlug.size}`);
  return idBySlug;
}

async function seedMenuItems(categoryIds: Map<string, string>): Promise<Map<string, string>> {
  const idByCode = new Map<string, string>();

  for (const item of menuItems) {
    const categoryId = categoryIds.get(item.category);
    if (!categoryId) throw new Error(`Unknown category "${item.category}" on dish ${item.id}`);

    const data = {
      slug: item.slug,
      name: item.name,
      description: item.description,
      categoryId,
      price: item.price,
      compareAtPrice: item.compareAtPrice ?? null,
      imageId: item.imageId,
      isVeg: true,
      isJain: item.isJain ?? false,
      spiceLevel: SPICE[item.spiceLevel] ?? "MILD",
      prepTime: item.prepTime,
      calories: item.calories,
      protein: item.protein ?? null,
      serves: item.serves,
      rating: item.rating,
      ratingCount: item.ratingCount,
      tags: item.tags.map((tag) => TAG[tag]).filter((tag): tag is DishTag => Boolean(tag)),
      available: item.available,
    } satisfies Omit<Prisma.MenuItemUncheckedCreateInput, "code">;

    const row = await prisma.menuItem.upsert({
      where: { code: item.id },
      update: data,
      create: { code: item.id, ...data },
    });
    idByCode.set(item.id, row.id);

    // Add-ons are re-derived from the source catalogue each run, so removing an
    // add-on upstream actually removes it here rather than leaving an orphan.
    await prisma.addOn.deleteMany({
      where: { menuItemId: row.id, code: { notIn: (item.addOns ?? []).map((addOn) => addOn.id) } },
    });
    for (const addOn of item.addOns ?? []) {
      await prisma.addOn.upsert({
        where: { menuItemId_code: { menuItemId: row.id, code: addOn.id } },
        update: { label: addOn.label, price: addOn.price },
        create: { menuItemId: row.id, code: addOn.id, label: addOn.label, price: addOn.price },
      });
    }
  }

  log(`menu items: ${idByCode.size}`);
  return idByCode;
}

async function seedPlans(): Promise<Map<PlanTier, string>> {
  const idByTier = new Map<PlanTier, string>();

  for (const [index, plan] of tiffinPlans.entries()) {
    const tier = PLAN_TIER[plan.tier];
    if (!tier) throw new Error(`Unknown plan tier "${plan.tier}"`);

    const data = {
      name: plan.name,
      headline: plan.headline,
      description: plan.description,
      weeklyPricePerMeal: plan.pricePerMeal.weekly,
      monthlyPricePerMeal: plan.pricePerMeal.monthly,
      weeklyMeals: plan.mealsPerCycle.weekly,
      monthlyMeals: plan.mealsPerCycle.monthly,
      includes: plan.includes,
      excludes: plan.excludes ?? [],
      badge: plan.badge ?? null,
      highlight: plan.highlight ?? false,
      imageId: plan.imageId,
      sortOrder: index,
      active: true,
    };

    const row = await prisma.tiffinPlan.upsert({
      where: { tier },
      update: data,
      create: { tier, ...data },
    });
    idByTier.set(tier, row.id);
  }

  log(`tiffin plans: ${idByTier.size}`);
  return idByTier;
}

async function seedOffers(): Promise<void> {
  for (const offer of offers) {
    const data = {
      title: offer.title,
      description: offer.description,
      discountType: offer.discountType.toUpperCase() as "PERCENTAGE" | "FLAT" | "FREEBIE",
      discountValue: offer.discountValue,
      minOrder: offer.minOrder,
      maxDiscount: offer.maxDiscount ?? null,
      validUntil: new Date(`${offer.validUntil}T23:59:59.000Z`),
      terms: offer.terms,
      imageId: offer.imageId,
      featured: offer.featured ?? false,
      appliesTo: (offer.appliesTo ?? "order").toUpperCase() as "ORDER" | "SUBSCRIPTION",
      active: true,
    };

    await prisma.offer.upsert({
      where: { code: offer.code },
      // `usedCount` is deliberately not reset — redemption history is real data.
      update: data,
      create: { code: offer.code, ...data },
    });
  }

  log(`offers: ${offers.length}`);
}

async function seedFaqs(): Promise<void> {
  for (const [index, faq] of faqs.entries()) {
    const data = {
      question: faq.question,
      answer: faq.answer,
      category: FAQ_CATEGORY[faq.category] ?? "ORDERING",
      sortOrder: index,
      published: true,
    };
    await prisma.faq.upsert({ where: { code: faq.id }, update: data, create: { code: faq.id, ...data } });
  }

  log(`faqs: ${faqs.length}`);
}

async function seedGallery(): Promise<void> {
  for (const [index, row] of galleryRows.entries()) {
    const data = {
      caption: row.caption,
      category: GALLERY_CATEGORY[row.category] ?? "DISHES",
      aspect: GALLERY_ASPECT[row.aspect] ?? "SQUARE",
      sortOrder: index,
      published: true,
    };

    const existing = await prisma.galleryImage.findFirst({
      where: { imageId: row.imageId },
      select: { id: true },
    });

    if (existing) await prisma.galleryImage.update({ where: { id: existing.id }, data });
    else await prisma.galleryImage.create({ data: { imageId: row.imageId, ...data } });
  }

  log(`gallery images: ${galleryRows.length}`);
}

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await prisma.adminUser.upsert({
    where: { email: env.ADMIN_EMAIL },
    // The password is reset on every run so a forgotten credential is fixed by
    // re-seeding with a new ADMIN_PASSWORD rather than a manual SQL update.
    update: { name: env.ADMIN_NAME, passwordHash, role: "OWNER", active: true },
    create: { email: env.ADMIN_EMAIL, name: env.ADMIN_NAME, passwordHash, role: "OWNER" },
  });

  log(`admin user: ${env.ADMIN_EMAIL}`);
}

/* -------------------------------------------------------------------------- */
/* Demo transactional data — so the admin dashboard is not an empty shell.     */
/* -------------------------------------------------------------------------- */

const DEMO_CUSTOMERS = [
  { name: "Ananya Sharma", phone: "9810012001", email: "ananya@example.com", line1: "B-402, Amrapali Sapphire", pincode: "201309" },
  { name: "Rohit Verma", phone: "9810012002", email: "rohit@example.com", line1: "Hostel 4, Room 218, Sector 62", pincode: "201309" },
  { name: "Priya Nair", phone: "9810012003", email: "priya@example.com", line1: "C-1104, Gaur Green Vista", pincode: "201014" },
  { name: "Kabir Malhotra", phone: "9810012004", email: "kabir@example.com", line1: "A-7, Sector 59 Market Road", pincode: "201301" },
  { name: "Sneha Gupta", phone: "9810012005", email: "sneha@example.com", line1: "204, Supertech Cape Town", pincode: "201301" },
] as const;

/** Minutes offset helper for building plausible demo timelines. */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * The statuses an order in `final` must have passed through, so seeded demo
 * orders carry a believable history rather than a single bare status.
 */
function timelineFor(final: OrderStatus): OrderStatus[] {
  const pipeline: OrderStatus[] = [
    "PENDING_CUSTOMER_CONFIRMATION",
    "CONFIRMED",
    "PREPARING",
    "COOKING",
    "PACKED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ];

  if (final === "CANCELLED") return ["PENDING_CUSTOMER_CONFIRMATION", "CONFIRMED", "CANCELLED"];
  if (final === "PENDING_PAYMENT") return ["PENDING_PAYMENT"];

  const index = pipeline.indexOf(final);
  return index === -1 ? [final] : pipeline.slice(0, index + 1);
}

const DEMO_ORDER_PLAN: Array<{
  customer: number;
  items: Array<{ code: string; quantity: number }>;
  status: OrderStatus;
  channel?: OrderChannel;
  daysAgo: number;
  couponCode?: string;
  paymentMethod: PaymentMethod;
}> = [
  { customer: 0, items: [{ code: "nin-06", quantity: 1 }, { code: "par-03", quantity: 4 }], status: "DELIVERED", daysAgo: 1, paymentMethod: "UPI" },
  { customer: 1, items: [{ code: "mag-05", quantity: 2 }, { code: "bev-03", quantity: 2 }], status: "DELIVERED", daysAgo: 2, paymentMethod: "COD" },
  { customer: 2, items: [{ code: "nin-02", quantity: 1 }, { code: "ric-01", quantity: 1 }, { code: "des-02", quantity: 1 }], status: "DELIVERED", daysAgo: 3, couponCode: "WEEKEND100", paymentMethod: "CARD" },
  { customer: 3, items: [{ code: "pas-06", quantity: 2 }], status: "DELIVERED", daysAgo: 5, paymentMethod: "UPI" },
  { customer: 4, items: [{ code: "snk-06", quantity: 1 }, { code: "snk-04", quantity: 2 }], status: "DELIVERED", daysAgo: 8, paymentMethod: "WALLET" },
  { customer: 0, items: [{ code: "nin-05", quantity: 1 }, { code: "par-05", quantity: 2 }], status: "OUT_FOR_DELIVERY", daysAgo: 0, paymentMethod: "UPI" },
  { customer: 1, items: [{ code: "mag-06", quantity: 1 }, { code: "snk-01", quantity: 1 }], status: "PREPARING", daysAgo: 0, paymentMethod: "COD" },
  { customer: 2, items: [{ code: "idl-02", quantity: 1 }, { code: "bev-01", quantity: 1 }], status: "CONFIRMED", daysAgo: 0, paymentMethod: "UPI" },
  { customer: 3, items: [{ code: "bur-02", quantity: 2 }, { code: "snk-02", quantity: 1 }], status: "PENDING_CUSTOMER_CONFIRMATION", daysAgo: 0, paymentMethod: "WHATSAPP", channel: "WHATSAPP" },
  { customer: 4, items: [{ code: "nin-01", quantity: 1 }, { code: "ric-02", quantity: 1 }], status: "COOKING", daysAgo: 0, paymentMethod: "WHATSAPP", channel: "WHATSAPP" },
  { customer: 0, items: [{ code: "pas-02", quantity: 1 }, { code: "bev-06", quantity: 1 }], status: "PACKED", daysAgo: 0, paymentMethod: "WHATSAPP", channel: "WHATSAPP" },
  { customer: 4, items: [{ code: "ric-05", quantity: 1 }], status: "CANCELLED", daysAgo: 4, paymentMethod: "UPI" },
];

async function seedDemoTransactions(itemIdsByCode: Map<string, string>, planIds: Map<PlanTier, string>): Promise<void> {
  // Demo rows are recognisable by their reserved order-number prefix, which is
  // also what makes this section idempotent: they are replaced wholesale.
  await prisma.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: "TSK-DEMO-" } } } });
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "TSK-DEMO-" } } });
  await prisma.subscriptionSkip.deleteMany({ where: { subscription: { code: { startsWith: "SUB-DEMO-" } } } });
  await prisma.subscription.deleteMany({ where: { code: { startsWith: "SUB-DEMO-" } } });

  const customerIds: string[] = [];
  const addressIds: string[] = [];

  for (const demo of DEMO_CUSTOMERS) {
    const customer = await prisma.customer.upsert({
      where: { phone: demo.phone },
      update: { name: demo.name, email: demo.email },
      create: { name: demo.name, phone: demo.phone, email: demo.email },
    });
    customerIds.push(customer.id);

    const existingAddress = await prisma.address.findFirst({
      where: { customerId: customer.id, line1: demo.line1 },
      select: { id: true },
    });
    const address =
      existingAddress ??
      (await prisma.address.create({
        data: {
          customerId: customer.id,
          label: "Home",
          line1: demo.line1,
          city: "Noida",
          pincode: demo.pincode,
          isDefault: true,
        },
        select: { id: true },
      }));
    addressIds.push(address.id);
  }

  const catalogue = await prisma.menuItem.findMany({
    where: { id: { in: [...itemIdsByCode.values()] } },
    select: { id: true, code: true, name: true, slug: true, price: true },
  });
  const byCode = new Map(catalogue.map((item) => [item.code, item]));

  const offerByCode = new Map(
    (await prisma.offer.findMany()).map((offer) => [offer.code, offer]),
  );

  for (const [index, plan] of DEMO_ORDER_PLAN.entries()) {
    const lines = plan.items.map((line) => {
      const item = byCode.get(line.code);
      if (!item) throw new Error(`Demo order references unknown dish ${line.code}`);
      return {
        menuItemId: item.id,
        name: item.name,
        slug: item.slug,
        unitPrice: item.price,
        quantity: line.quantity,
        addOnTotal: 0,
        addOnLabels: [] as string[],
        componentLabels: [] as string[],
        isCustomTiffin: false,
        note: null,
        lineTotal: item.price * line.quantity,
      };
    });

    const offer = plan.couponCode ? offerByCode.get(plan.couponCode) ?? null : null;
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    // The demo bill runs through the real pricing function so the dashboard's
    // revenue numbers are internally consistent with the live checkout.
    const coupon = offer
      ? { ok: true, discount: Math.min(offer.discountValue, subtotal), message: "", offer }
      : null;
    const bill = calculateBill(lines, coupon);

    const placedAt = addDays(new Date(), -plan.daysAgo);
    const customerId = customerIds[plan.customer];
    const addressId = addressIds[plan.customer];
    const demoCustomer = DEMO_CUSTOMERS[plan.customer];
    if (!customerId || !addressId || !demoCustomer) continue;

    await prisma.order.create({
      data: {
        orderNumber: `TSK-DEMO-${String(index + 1).padStart(3, "0")}`,
        customerId,
        addressId,
        deliveryName: demoCustomer.name,
        deliveryPhone: demoCustomer.phone,
        deliveryLine1: demoCustomer.line1,
        deliveryCity: "Noida",
        deliveryPincode: demoCustomer.pincode,
        status: plan.status,
        channel: plan.channel ?? "COD",
        paymentMethod: plan.paymentMethod,
        paymentStatus:
          plan.status === "CANCELLED"
            ? "REFUNDED"
            : plan.status !== "DELIVERED" &&
                (plan.paymentMethod === "COD" || plan.paymentMethod === "WHATSAPP")
              ? "PENDING"
              : "PAID",
        couponCode: offer?.code ?? null,
        offerId: offer?.id ?? null,
        subtotal: bill.subtotal,
        discount: bill.discount,
        deliveryFee: bill.deliveryFee,
        packagingFee: bill.packagingFee,
        gst: bill.gst,
        total: bill.total,
        createdAt: placedAt,
        confirmedAt: plan.status === "PENDING_CUSTOMER_CONFIRMATION" ? null : placedAt,
        deliveredAt: plan.status === "DELIVERED" ? addDays(placedAt, 0) : null,
        cancelledAt: plan.status === "CANCELLED" ? placedAt : null,
        cancelReason: plan.status === "CANCELLED" ? "Customer changed plans" : null,
        items: { create: lines },
        // Demo orders get a plausible history so the tracking timeline and the
        // admin detail view have something to render.
        events: {
          create: timelineFor(plan.status).map((status, step) => ({
            status,
            actor: step === 0 ? "customer" : "seed",
            createdAt: addMinutes(placedAt, step * 8),
          })),
        },
      },
    });
  }

  log(`demo orders: ${DEMO_ORDER_PLAN.length}`);

  const demoSubscriptions: Array<{
    customer: number;
    tier: PlanTier;
    cycle: BillingCycle;
    slot: MealSlot;
    status: "ACTIVE" | "PAUSED" | "PENDING";
    startedDaysAgo: number;
    consumed: number;
  }> = [
    { customer: 0, tier: "REGULAR", cycle: "MONTHLY", slot: "LUNCH", status: "ACTIVE", startedDaysAgo: 12, consumed: 10 },
    { customer: 1, tier: "STUDENT", cycle: "MONTHLY", slot: "BOTH", status: "ACTIVE", startedDaysAgo: 5, consumed: 8 },
    { customer: 2, tier: "PREMIUM", cycle: "WEEKLY", slot: "DINNER", status: "PAUSED", startedDaysAgo: 20, consumed: 4 },
    { customer: 3, tier: "REGULAR", cycle: "MONTHLY", slot: "LUNCH", status: "ACTIVE", startedDaysAgo: 2, consumed: 1 },
    { customer: 4, tier: "STUDENT", cycle: "WEEKLY", slot: "LUNCH", status: "PENDING", startedDaysAgo: 0, consumed: 0 },
  ];

  const plans = await prisma.tiffinPlan.findMany();
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  for (const [index, demo] of demoSubscriptions.entries()) {
    const planId = planIds.get(demo.tier);
    const plan = planId ? planById.get(planId) : undefined;
    const customerId = customerIds[demo.customer];
    const addressId = addressIds[demo.customer];
    if (!plan || !planId || !customerId || !addressId) continue;

    const isWeekly = demo.cycle === "WEEKLY";
    const pricePerMeal = isWeekly ? plan.weeklyPricePerMeal : plan.monthlyPricePerMeal;
    const mealsTotal = (isWeekly ? plan.weeklyMeals : plan.monthlyMeals) * (demo.slot === "BOTH" ? 2 : 1);
    const startDate = toDateOnly(addDays(new Date(), -demo.startedDaysAgo));
    const mealsRemaining = Math.max(0, mealsTotal - demo.consumed);

    await prisma.subscription.create({
      data: {
        code: `SUB-DEMO-${String(index + 1).padStart(3, "0")}`,
        customerId,
        planId,
        addressId,
        addressLabel: "Home",
        cycle: demo.cycle,
        slot: demo.slot,
        status: demo.status,
        startDate,
        nextDeliveryDate: toDateOnly(addDays(new Date(), 1)),
        endDate: projectEndDate(toDateOnly(new Date()), mealsRemaining, demo.slot),
        mealsTotal,
        mealsRemaining,
        pricePerMeal,
        amount: mealsTotal * pricePerMeal,
        paymentMethod: "UPI",
        paymentStatus: demo.status === "PENDING" ? "PENDING" : "PAID",
        createdAt: addDays(new Date(), -demo.startedDaysAgo),
      },
    });
  }

  log(`demo subscriptions: ${demoSubscriptions.length}`);

  const demoNewsletter = [
    "ananya@example.com",
    "rohit@example.com",
    "priya@example.com",
    "kabir@example.com",
    "sneha@example.com",
    "arjun@example.com",
    "meera@example.com",
  ];
  for (const email of demoNewsletter) {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email, source: "seed" },
    });
  }
  log(`newsletter subscribers: ${demoNewsletter.length}`);
}

/* -------------------------------------------------------------------------- */

export async function runSeed(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("\nSeeding The Secret Kitchen…\n");

  const categoryIds = await seedCategories();
  const itemIds = await seedMenuItems(categoryIds);
  const planIds = await seedPlans();
  await seedOffers();
  await seedFaqs();
  await seedGallery();
  await seedAdmin();

  /**
   * Demo orders, customers, subscriptions and newsletter rows are OPT-IN and
   * off by default.
   *
   * They exist so a fresh local checkout has something to look at, but seeding
   * them into a real deployment would put fabricated revenue and fake customer
   * names straight onto the dashboard — numbers the owner might then believe.
   * Catalogue content (menu, categories, plans, offers, FAQs, gallery) is real
   * business configuration and is always seeded.
   */
  if (env.SEED_DEMO_DATA) {
    await seedDemoTransactions(itemIds, planIds);
  } else {
    log("demo transactions: skipped (set SEED_DEMO_DATA=true to include them)");
  }

  // eslint-disable-next-line no-console
  console.log("\nSeed complete.\n");
}

export async function main(): Promise<void> {
  try {
    await runSeed();
  } finally {
    await prisma.$disconnect();
  }
}
