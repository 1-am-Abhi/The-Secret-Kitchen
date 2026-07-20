import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { toDateOnly } from "../../utils/dates";
import { mapMenuItem } from "../../utils/mappers";
import type { CreateSpecialInput, SpecialsQuery, UpdateSpecialInput } from "./specials.schema";

const ITEM_INCLUDE = { category: true, addOns: true } as const;

/**
 * Deterministic fallback rotation, ported from
 * web/src/data/menu.ts::getTodaysSpecial. When the kitchen has not curated a
 * day, the day-of-year seeds an offset into the chef-special/bestseller pool so
 * every visitor sees the same set on a given date and it changes at midnight —
 * without requiring an admin to touch the panel daily.
 */
async function rotatingFallback(date: Date, limit: number): Promise<Record<string, unknown>[]> {
  const pool = await prisma.menuItem.findMany({
    where: { available: true, tags: { hasSome: ["CHEF_SPECIAL", "BESTSELLER"] } },
    include: ITEM_INCLUDE,
    orderBy: { code: "asc" },
  });
  if (!pool.length) return [];

  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((toDateOnly(date).getTime() - yearStart) / 86_400_000);
  const offset = dayOfYear % pool.length;

  return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, limit).map(mapMenuItem);
}

export const getTodaysSpecials = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as SpecialsQuery;
  const date = query.date ? toDateOnly(query.date) : toDateOnly(new Date());

  const curated = await prisma.dailySpecial.findMany({
    /*
     * `menuItem.available` is not optional here. A special is curated days in
     * advance; if the kitchen runs out and switches the dish off, this endpoint
     * would otherwise keep featuring it on the home page — the one place a
     * sold-out dish is most prominent. The rotating fallback below has always
     * filtered on it; the curated branch did not.
     */
    where: { date, menuItem: { available: true } },
    include: { menuItem: { include: ITEM_INCLUDE } },
    orderBy: { sortOrder: "asc" },
    take: query.limit,
  });

  if (curated.length) {
    res.json({
      date: date.toISOString().slice(0, 10),
      source: "curated",
      data: curated.map((special) => ({
        id: special.id,
        headline: special.headline ?? undefined,
        specialPrice: special.specialPrice ?? undefined,
        item: mapMenuItem(special.menuItem),
      })),
    });
    return;
  }

  const fallback = await rotatingFallback(date, query.limit);
  res.json({
    date: date.toISOString().slice(0, 10),
    source: "rotation",
    data: fallback.map((item) => ({ id: null, headline: undefined, specialPrice: undefined, item })),
  });
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export const listSpecials = asyncHandler(async (_req: Request, res: Response) => {
  // Only forward-looking rows matter to the admin planner; yesterday's specials
  // are history and would otherwise grow the list without bound.
  const specials = await prisma.dailySpecial.findMany({
    where: { date: { gte: toDateOnly(new Date()) } },
    include: { menuItem: { include: ITEM_INCLUDE } },
    orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
  });

  res.json({
    data: specials.map((special) => ({
      id: special.id,
      date: special.date.toISOString().slice(0, 10),
      headline: special.headline ?? undefined,
      specialPrice: special.specialPrice ?? undefined,
      sortOrder: special.sortOrder,
      item: mapMenuItem(special.menuItem),
    })),
  });
});

export const createSpecial = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateSpecialInput;

  const item = await prisma.menuItem.findFirst({
    where: { OR: [{ id: body.menuItem }, { slug: body.menuItem }, { code: body.menuItem }] },
    select: { id: true },
  });
  if (!item) throw AppError.badRequest(`Unknown dish "${body.menuItem}".`);

  const special = await prisma.dailySpecial.create({
    data: {
      date: toDateOnly(body.date),
      menuItemId: item.id,
      specialPrice: body.specialPrice ?? null,
      headline: body.headline ?? null,
      sortOrder: body.sortOrder,
    },
    include: { menuItem: { include: ITEM_INCLUDE } },
  });

  res.status(201).json({
    data: {
      id: special.id,
      date: special.date.toISOString().slice(0, 10),
      item: mapMenuItem(special.menuItem),
    },
  });
});

export const updateSpecial = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as UpdateSpecialInput;

  const special = await prisma.dailySpecial.update({
    where: { id },
    data: {
      ...(body.date !== undefined ? { date: toDateOnly(body.date) } : {}),
      ...(body.specialPrice !== undefined ? { specialPrice: body.specialPrice } : {}),
      ...(body.headline !== undefined ? { headline: body.headline } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    include: { menuItem: { include: ITEM_INCLUDE } },
  });

  res.json({
    data: {
      id: special.id,
      date: special.date.toISOString().slice(0, 10),
      item: mapMenuItem(special.menuItem),
    },
  });
});

export const deleteSpecial = asyncHandler(async (req: Request, res: Response) => {
  await prisma.dailySpecial.delete({ where: { id: String(req.params.id) } });
  res.json({ message: "Special removed." });
});
