import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { commerce } from "../../config/commerce";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { mapOffer } from "../../utils/mappers";
import { evaluateCoupon } from "../../utils/pricing";
import type {
  CreateOfferInput,
  ListOffersQuery,
  UpdateOfferInput,
  ValidateCouponInput,
} from "./offers.schema";

export const listOffers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOffersQuery;

  const where: Prisma.OfferWhereInput = {};
  if (query.includeInactive !== "true") {
    where.active = true;
    // Expired coupons are noise on the public offers page.
    where.validUntil = { gte: new Date() };
  }
  if (query.featured) where.featured = query.featured === "true";
  if (query.appliesTo) where.appliesTo = query.appliesTo;

  const offers = await prisma.offer.findMany({
    where,
    orderBy: [{ featured: "desc" }, { validUntil: "asc" }],
  });

  res.json({ data: offers.map(mapOffer) });
});

/**
 * Coupon pre-check for the cart. Returns the same `{ ok, discount, message }`
 * shape as the storefront's `applyCoupon`, so the cart drawer can display the
 * result without translating anything — and the number it shows is the number
 * the order endpoint will independently recompute.
 */
export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal, context } = req.body as ValidateCouponInput;

  const offer = await prisma.offer.findUnique({ where: { code: code.trim().toUpperCase() } });
  const result = evaluateCoupon(offer, subtotal, context);

  res.json({
    ok: result.ok,
    discount: result.discount,
    message: result.message,
    offer: result.offer ? mapOffer(result.offer) : undefined,
    /** Echoed so the cart can render the free-delivery nudge consistently. */
    freeDeliveryAbove: commerce.freeDeliveryAbove,
  });
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateOfferInput;

  const offer = await prisma.offer.create({
    data: {
      code: body.code,
      title: body.title,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrder: body.minOrder,
      maxDiscount: body.maxDiscount ?? null,
      ...(body.validFrom ? { validFrom: body.validFrom } : {}),
      validUntil: body.validUntil,
      terms: body.terms,
      imageId: body.imageId,
      imageUrl: body.imageUrl ?? null,
      featured: body.featured,
      appliesTo: body.appliesTo,
      active: body.active,
      usageLimit: body.usageLimit ?? null,
    },
  });

  res.status(201).json({ data: mapOffer(offer) });
});

export const updateOffer = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as UpdateOfferInput;

  const data: Prisma.OfferUpdateInput = {};
  if (body.code !== undefined) data.code = body.code;
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.discountType !== undefined) data.discountType = body.discountType;
  if (body.discountValue !== undefined) data.discountValue = body.discountValue;
  if (body.minOrder !== undefined) data.minOrder = body.minOrder;
  if (body.maxDiscount !== undefined) data.maxDiscount = body.maxDiscount;
  if (body.validFrom !== undefined) data.validFrom = body.validFrom;
  if (body.validUntil !== undefined) data.validUntil = body.validUntil;
  if (body.terms !== undefined) data.terms = body.terms;
  if (body.imageId !== undefined) data.imageId = body.imageId;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.featured !== undefined) data.featured = body.featured;
  if (body.appliesTo !== undefined) data.appliesTo = body.appliesTo;
  if (body.active !== undefined) data.active = body.active;
  if (body.usageLimit !== undefined) data.usageLimit = body.usageLimit;

  const offer = await prisma.offer.update({ where: { id }, data });
  res.json({ data: mapOffer(offer) });
});

export const deleteOffer = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  // Orders reference the offer they redeemed. Deactivating keeps that audit
  // trail intact while taking the code out of circulation immediately.
  const redeemed = await prisma.order.count({ where: { offerId: id } });
  if (redeemed > 0) {
    const offer = await prisma.offer.update({ where: { id }, data: { active: false } });
    res.json({
      data: mapOffer(offer),
      message: "This coupon has been redeemed before, so it was deactivated instead of deleted.",
    });
    return;
  }

  await prisma.offer.delete({ where: { id } });
  res.json({ message: "Offer deleted." });
});
