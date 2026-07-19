import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { mapCategory, mapMenuItem } from "../../utils/mappers";
import { paginated, toSkipTake } from "../../utils/pagination";
import type {
  CreateCategoryInput,
  CreateMenuItemInput,
  ListMenuQuery,
  UpdateCategoryInput,
  UpdateMenuItemInput,
} from "./menu.schema";

const ITEM_INCLUDE = {
  category: true,
  addOns: { orderBy: { price: "asc" } },
} satisfies Prisma.MenuItemInclude;

const SORT_MAP: Record<ListMenuQuery["sort"], Prisma.MenuItemOrderByWithRelationInput[]> = {
  // "Popular" leans on rating volume — a 4.9 from 12 people should not outrank
  // a 4.8 from 1,900, which is how the storefront's bestseller rail is ordered.
  popular: [{ ratingCount: "desc" }, { rating: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  rating: [{ rating: "desc" }, { ratingCount: "desc" }],
  newest: [{ createdAt: "desc" }],
};

function buildWhere(query: ListMenuQuery): Prisma.MenuItemWhereInput {
  const where: Prisma.MenuItemWhereInput = {};

  if (query.available !== "all") where.available = query.available === "true";
  if (query.category) where.category = { slug: query.category };
  if (query.tags?.length) where.tags = { hasSome: query.tags };
  if (query.spiceLevel) where.spiceLevel = query.spiceLevel;
  if (query.isJain !== undefined) where.isJain = query.isJain;

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export const listMenu = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMenuQuery;
  const where = buildWhere(query);

  // The storefront menu page renders category rails, so it asks for the whole
  // catalogue grouped in one round trip rather than paging through it.
  if (query.grouped === "true") {
    const [categories, items] = await Promise.all([
      prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.menuItem.findMany({ where, include: ITEM_INCLUDE, orderBy: SORT_MAP[query.sort] }),
    ]);

    const groups = categories.map((category) => ({
      category: mapCategory(category),
      items: items.filter((item) => item.categoryId === category.id).map(mapMenuItem),
    }));

    res.json({ data: groups, meta: { total: items.length, categories: categories.length } });
    return;
  }

  const { skip, take } = toSkipTake(query);
  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      include: ITEM_INCLUDE,
      orderBy: SORT_MAP[query.sort],
      skip,
      take,
    }),
    prisma.menuItem.count({ where }),
  ]);

  res.json(paginated(items.map(mapMenuItem), total, query));
});

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: { where: { available: true } } } } },
  });

  // "from ₹49" labels need the cheapest available dish per category. One
  // grouped aggregate beats N queries.
  const startingPrices = await prisma.menuItem.groupBy({
    by: ["categoryId"],
    where: { available: true },
    _min: { price: true },
  });
  const priceByCategory = new Map(startingPrices.map((row) => [row.categoryId, row._min.price]));

  res.json({
    data: categories.map((category) => ({
      ...mapCategory(category),
      startingPrice: priceByCategory.get(category.id) ?? 0,
    })),
  });
});

export const getMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const slug = String(req.params.slug);

  const item = await prisma.menuItem.findUnique({ where: { slug }, include: ITEM_INCLUDE });
  if (!item) throw AppError.notFound(`No dish found for "${slug}".`);

  const related = await prisma.menuItem.findMany({
    where: { categoryId: item.categoryId, id: { not: item.id }, available: true },
    include: ITEM_INCLUDE,
    orderBy: [{ ratingCount: "desc" }],
    take: 4,
  });

  res.json({ data: mapMenuItem(item), related: related.map(mapMenuItem) });
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

/** Resolves the `category` field, which may be an id or a slug. */
async function resolveCategoryId(reference: string): Promise<string> {
  const category = await prisma.category.findFirst({
    where: { OR: [{ id: reference }, { slug: reference }] },
    select: { id: true },
  });
  if (!category) throw AppError.badRequest(`Unknown category "${reference}".`);
  return category.id;
}

export const createMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateMenuItemInput;
  const categoryId = await resolveCategoryId(body.category);

  const item = await prisma.menuItem.create({
    data: {
      code: body.code,
      slug: body.slug,
      name: body.name,
      description: body.description,
      categoryId,
      price: body.price,
      compareAtPrice: body.compareAtPrice ?? null,
      imageId: body.imageId,
      imageUrl: body.imageUrl ?? null,
      isJain: body.isJain,
      spiceLevel: body.spiceLevel,
      prepTime: body.prepTime,
      calories: body.calories,
      protein: body.protein ?? null,
      serves: body.serves,
      rating: body.rating,
      ratingCount: body.ratingCount,
      tags: body.tags,
      available: body.available,
      addOns: { create: body.addOns },
    },
    include: ITEM_INCLUDE,
  });

  res.status(201).json({ data: mapMenuItem(item) });
});

export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as UpdateMenuItemInput;

  const existing = await prisma.menuItem.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw AppError.notFound("That dish does not exist.");

  const data: Prisma.MenuItemUpdateInput = {};
  if (body.code !== undefined) data.code = body.code;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.price !== undefined) data.price = body.price;
  if (body.compareAtPrice !== undefined) data.compareAtPrice = body.compareAtPrice;
  if (body.imageId !== undefined) data.imageId = body.imageId;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
  if (body.isJain !== undefined) data.isJain = body.isJain;
  if (body.spiceLevel !== undefined) data.spiceLevel = body.spiceLevel;
  if (body.prepTime !== undefined) data.prepTime = body.prepTime;
  if (body.calories !== undefined) data.calories = body.calories;
  if (body.protein !== undefined) data.protein = body.protein;
  if (body.serves !== undefined) data.serves = body.serves;
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.ratingCount !== undefined) data.ratingCount = body.ratingCount;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.available !== undefined) data.available = body.available;
  if (body.category !== undefined) {
    data.category = { connect: { id: await resolveCategoryId(body.category) } };
  }

  // Add-ons are a value set, not independently addressable rows in the admin
  // UI, so a submitted list replaces the existing one wholesale.
  const item = await prisma.$transaction(async (tx) => {
    if (body.addOns !== undefined) {
      await tx.addOn.deleteMany({ where: { menuItemId: id } });
      if (body.addOns.length) {
        await tx.addOn.createMany({
          data: body.addOns.map((addOn) => ({ ...addOn, menuItemId: id })),
        });
      }
    }
    return tx.menuItem.update({ where: { id }, data, include: ITEM_INCLUDE });
  });

  res.json({ data: mapMenuItem(item) });
});

export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  // A dish that appears on a historical order must never vanish from that
  // order, so anything already sold is retired (unavailable) instead of deleted.
  const orderCount = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (orderCount > 0) {
    const item = await prisma.menuItem.update({
      where: { id },
      data: { available: false },
      include: ITEM_INCLUDE,
    });
    res.json({
      data: mapMenuItem(item),
      message: "This dish has past orders, so it was retired instead of deleted.",
    });
    return;
  }

  await prisma.menuItem.delete({ where: { id } });
  res.json({ message: "Dish deleted." });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateCategoryInput;
  const category = await prisma.category.create({ data: body });
  res.status(201).json({ data: mapCategory(category) });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const body = req.body as UpdateCategoryInput;
  const category = await prisma.category.update({ where: { id }, data: body });
  res.json({ data: mapCategory(category) });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
  if (itemCount > 0) {
    throw AppError.conflict(
      `Move or delete the ${itemCount} dish(es) in this category before removing it.`,
    );
  }

  await prisma.category.delete({ where: { id } });
  res.json({ message: "Category deleted." });
});
