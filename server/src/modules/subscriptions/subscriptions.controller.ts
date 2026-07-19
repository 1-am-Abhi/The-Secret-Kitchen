import type { Prisma, Subscription, SubscriptionSkip, TiffinPlan } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  formatDateOnly,
  nextDeliveryDate,
  projectEndDate,
  resumeDate,
  toDateOnly,
} from "../../utils/dates";
import { mapPlan } from "../../utils/mappers";
import { generateSubscriptionCode, withUniqueReference } from "../../utils/orderNumber";
import { paginated, toSkipTake } from "../../utils/pagination";
import { calculatePlanPeriod, evaluateCoupon } from "../../utils/pricing";
import type {
  CreatePlanInput,
  CreateSubscriptionInput,
  LifecycleInput,
  ListSubscriptionsQuery,
  SkipInput,
  UpdatePlanInput,
} from "./subscriptions.schema";

type SubscriptionWithRelations = Subscription & {
  plan: TiffinPlan;
  skips: SubscriptionSkip[];
};

function mapSubscription(subscription: SubscriptionWithRelations): Record<string, unknown> {
  return {
    id: subscription.id,
    code: subscription.code,
    planTier: subscription.plan.tier.toLowerCase(),
    planName: subscription.plan.name,
    cycle: subscription.cycle.toLowerCase(),
    slot: subscription.slot.toLowerCase(),
    status: subscription.status.toLowerCase(),
    startDate: formatDateOnly(subscription.startDate),
    nextDeliveryDate: formatDateOnly(subscription.nextDeliveryDate),
    endDate: subscription.endDate ? formatDateOnly(subscription.endDate) : undefined,
    mealsTotal: subscription.mealsTotal,
    mealsRemaining: subscription.mealsRemaining,
    pricePerMeal: subscription.pricePerMeal,
    amount: subscription.amount,
    discount: subscription.discount,
    couponCode: subscription.couponCode ?? undefined,
    paymentStatus: subscription.paymentStatus,
    addressLabel: subscription.addressLabel,
    skippedDates: subscription.skips.map((skip) => formatDateOnly(skip.date)),
    preferences: subscription.preferences ?? undefined,
    createdAt: subscription.createdAt,
  };
}

const SUBSCRIPTION_INCLUDE = {
  plan: true,
  skips: { orderBy: { date: "asc" } },
} satisfies Prisma.SubscriptionInclude;

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await prisma.tiffinPlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    data: plans.map((plan) => ({
      ...mapPlan(plan),
      // Rupees saved per month by committing to monthly billing instead of
      // paying the weekly rate for the same number of meals.
      monthlySavings: (plan.weeklyPricePerMeal - plan.monthlyPricePerMeal) * plan.monthlyMeals,
    })),
  });
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreatePlanInput;
  const plan = await prisma.tiffinPlan.create({
    data: { ...body, badge: body.badge ?? null, imageUrl: body.imageUrl ?? null },
  });
  res.status(201).json({ data: mapPlan(plan) });
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdatePlanInput;
  const plan = await prisma.tiffinPlan.update({
    where: { id: String(req.params.id) },
    data: body,
  });
  res.json({ data: mapPlan(plan) });
});

/* -------------------------------------------------------------------------- */
/* Subscriptions — public                                                     */
/* -------------------------------------------------------------------------- */

export const createSubscription = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateSubscriptionInput;

  const plan = await prisma.tiffinPlan.findUnique({ where: { tier: body.planTier } });
  if (!plan || !plan.active) throw AppError.badRequest("That plan is not available.");

  const period = calculatePlanPeriod({
    weeklyPricePerMeal: plan.weeklyPricePerMeal,
    monthlyPricePerMeal: plan.monthlyPricePerMeal,
    weeklyMeals: plan.weeklyMeals,
    monthlyMeals: plan.monthlyMeals,
    cycle: body.cycle,
    slot: body.slot,
    customMeals: body.customMeals,
  });

  const offer = body.couponCode
    ? await prisma.offer.findUnique({ where: { code: body.couponCode.trim().toUpperCase() } })
    : null;
  const coupon = body.couponCode ? evaluateCoupon(offer, period.amount, "SUBSCRIPTION") : null;
  if (body.couponCode && coupon && !coupon.ok) {
    throw AppError.unprocessable(coupon.message, { code: "COUPON_REJECTED" });
  }
  const discount = coupon?.ok ? coupon.discount : 0;

  // Deliveries begin the day AFTER sign-up (or the requested start date) so the
  // kitchen has a full prep cycle; Sundays roll forward automatically.
  const startDate = body.startDate ? toDateOnly(body.startDate) : toDateOnly(new Date());
  const firstDelivery = nextDeliveryDate(startDate);

  const subscription = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone: body.customer.phone },
      update: {
        name: body.customer.name,
        ...(body.customer.email ? { email: body.customer.email } : {}),
      },
      create: {
        name: body.customer.name,
        phone: body.customer.phone,
        email: body.customer.email ?? null,
      },
      select: { id: true },
    });

    const address = await tx.address.create({
      data: {
        customerId: customer.id,
        label: body.address.label,
        line1: body.address.line1,
        line2: body.address.line2 ?? null,
        landmark: body.address.landmark ?? null,
        city: body.address.city,
        state: body.address.state,
        pincode: body.address.pincode,
      },
      select: { id: true },
    });

    return withUniqueReference(generateSubscriptionCode, (code) =>
      tx.subscription.create({
        data: {
          code,
          customerId: customer.id,
          planId: plan.id,
          addressId: address.id,
          addressLabel: body.address.label,
          cycle: body.cycle,
          slot: body.slot,
          // ACTIVE only once payment is confirmed; UPI mandates and cards are
          // assumed captured upstream, COD-style "pay on first delivery" is not.
          status: body.paymentMethod === "COD" ? "PENDING" : "ACTIVE",
          startDate,
          nextDeliveryDate: firstDelivery,
          endDate: projectEndDate(firstDelivery, period.meals, body.slot),
          mealsTotal: period.meals,
          mealsRemaining: period.meals,
          pricePerMeal: period.pricePerMeal,
          amount: Math.max(0, period.amount - discount),
          discount,
          couponCode: coupon?.ok ? coupon.offer?.code ?? null : null,
          paymentMethod: body.paymentMethod,
          paymentStatus: body.paymentMethod === "COD" ? "PENDING" : "PAID",
          preferences: body.preferences ?? null,
        },
        include: SUBSCRIPTION_INCLUDE,
      }),
    );
  });

  res.status(201).json({ data: mapSubscription(subscription), message: "Subscription created." });
});

/** Loads a subscription and enforces the guest phone check unless admin. */
async function loadForMutation(
  req: Request,
  id: string,
): Promise<SubscriptionWithRelations & { customer: { phone: string } }> {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: { ...SUBSCRIPTION_INCLUDE, customer: { select: { phone: true } } },
  });
  if (!subscription) throw AppError.notFound("That subscription does not exist.");

  if (!req.admin) {
    const phone = (req.body as LifecycleInput).phone;
    if (!phone || phone !== subscription.customer.phone) {
      throw AppError.forbidden("Verify the phone number on this subscription to manage it.");
    }
  }
  return subscription;
}

export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await prisma.subscription.findFirst({
    where: { OR: [{ id: String(req.params.id) }, { code: String(req.params.id).toUpperCase() }] },
    include: SUBSCRIPTION_INCLUDE,
  });
  if (!subscription) throw AppError.notFound("That subscription does not exist.");
  res.json({ data: mapSubscription(subscription) });
});

export const pauseSubscription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await loadForMutation(req, String(req.params.id));

  if (existing.status !== "ACTIVE") {
    throw AppError.conflict(`Only an active plan can be paused (this one is ${existing.status.toLowerCase()}).`);
  }

  // Pausing never burns meals: `mealsRemaining` is deliberately untouched so the
  // balance rolls over, which is the promise made on the tiffin page.
  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: { status: "PAUSED", pausedAt: new Date() },
    include: SUBSCRIPTION_INCLUDE,
  });

  res.json({ data: mapSubscription(subscription), message: "Subscription paused." });
});

export const resumeSubscription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await loadForMutation(req, String(req.params.id));

  if (existing.status !== "PAUSED") {
    throw AppError.conflict("Only a paused plan can be resumed.");
  }

  // Delivery restarts from the next dispatch day — never a date already past,
  // because the kitchen cannot retroactively cook for it.
  const nextDate = resumeDate(new Date(), existing.skips.map((skip) => skip.date));

  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      pausedAt: null,
      nextDeliveryDate: nextDate,
      // The run-out date shifts by exactly the length of the pause.
      endDate: projectEndDate(nextDate, existing.mealsRemaining, existing.slot),
    },
    include: SUBSCRIPTION_INCLUDE,
  });

  res.json({ data: mapSubscription(subscription), message: "Subscription resumed." });
});

export const skipDelivery = asyncHandler(async (req: Request, res: Response) => {
  const existing = await loadForMutation(req, String(req.params.id));
  const body = req.body as SkipInput;

  if (existing.status === "CANCELLED") {
    throw AppError.conflict("This subscription has been cancelled.");
  }

  const date = toDateOnly(body.date);
  const today = toDateOnly(new Date());
  // The kitchen commits ingredients the evening before; a same-day or past skip
  // costs a meal that has already been cooked.
  if (date <= today) {
    throw AppError.badRequest("Skips must be requested at least a day in advance.");
  }

  const alreadySkipped = existing.skips.some(
    (skip) => formatDateOnly(skip.date) === formatDateOnly(date) && skip.slot === body.slot,
  );
  if (alreadySkipped) throw AppError.conflict("That delivery is already skipped.");

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.subscriptionSkip.create({
      data: {
        subscriptionId: existing.id,
        date,
        slot: body.slot,
        reason: body.reason ?? null,
      },
    });

    // A skipped meal is credited back, so the plan simply runs one day longer;
    // `mealsRemaining` is untouched and the end date is re-projected instead.
    const skippedDates = [...existing.skips.map((skip) => skip.date), date];
    const nextDate =
      formatDateOnly(existing.nextDeliveryDate) === formatDateOnly(date)
        ? nextDeliveryDate(date, skippedDates)
        : existing.nextDeliveryDate;

    return tx.subscription.update({
      where: { id: existing.id },
      data: {
        nextDeliveryDate: nextDate,
        endDate: projectEndDate(nextDate, existing.mealsRemaining, existing.slot),
      },
      include: SUBSCRIPTION_INCLUDE,
    });
  });

  res.json({ data: mapSubscription(subscription), message: "Delivery skipped." });
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await loadForMutation(req, String(req.params.id));
  if (existing.status === "CANCELLED") throw AppError.conflict("Already cancelled.");

  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    include: SUBSCRIPTION_INCLUDE,
  });

  res.json({
    data: mapSubscription(subscription),
    // Pro-rata refund value of the meals never delivered, as promised in the FAQ.
    refundEstimate: subscription.mealsRemaining * subscription.pricePerMeal,
    message: "Subscription cancelled.",
  });
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSubscriptionsQuery;

  const where: Prisma.SubscriptionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.planTier) where.plan = { tier: query.planTier };
  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: "insensitive" } },
      { customer: { phone: { contains: query.search } } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  const { skip, take } = toSkipTake(query);
  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { ...SUBSCRIPTION_INCLUDE, customer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.subscription.count({ where }),
  ]);

  res.json(
    paginated(
      subscriptions.map((subscription) => ({
        ...mapSubscription(subscription),
        customer: subscription.customer,
      })),
      total,
      query,
    ),
  );
});
