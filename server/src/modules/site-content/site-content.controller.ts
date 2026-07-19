import type { SiteContent } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  CONTENT_BLOCKS,
  CONTENT_KEYS,
  type ContentKey,
  type UpsertContentInput,
} from "./site-content.schema";

/**
 * Editable storefront content.
 *
 * A missing row is a first-class state, not an error: the storefront renders an
 * empty state for a block nobody has written yet. Nothing in this module ever
 * substitutes a placeholder, because a placeholder on a live site is a lie.
 */

function mapBlock(block: SiteContent): Record<string, unknown> {
  return {
    key: block.key,
    value: block.value,
    published: block.published,
    updatedAt: block.updatedAt.toISOString(),
  };
}

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = req.query.includeUnpublished === "true" && Boolean(req.admin);

  const blocks = await prisma.siteContent.findMany({
    where: includeUnpublished ? {} : { published: true },
    orderBy: { key: "asc" },
  });

  res.json({
    data: blocks.map(mapBlock),
    // Advertising the full registry lets the admin panel offer every block,
    // including the ones nobody has authored yet.
    keys: CONTENT_KEYS,
  });
});

export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as ContentKey;

  const block = await prisma.siteContent.findUnique({ where: { key } });
  if (!block) throw AppError.notFound(`No content has been published for "${key}" yet.`);

  res.json({ data: mapBlock(block) });
});

export const upsertContent = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as ContentKey;
  const body = req.body as UpsertContentInput;

  const parsed = CONTENT_BLOCKS[key].safeParse(body.value);
  if (!parsed.success) {
    throw AppError.badRequest(`That content does not match the "${key}" block.`, parsed.error.flatten());
  }

  const block = await prisma.siteContent.upsert({
    where: { key },
    update: { value: parsed.data, published: body.published },
    create: { key, value: parsed.data, published: body.published },
  });

  res.json({ data: mapBlock(block) });
});

export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as ContentKey;

  await prisma.siteContent.delete({ where: { key } }).catch(() => {
    throw AppError.notFound(`No content has been published for "${key}" yet.`);
  });

  res.json({ message: "Content block cleared." });
});
