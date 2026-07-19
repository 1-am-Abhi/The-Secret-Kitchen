import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { destroyAsset, uploadBuffer } from "../../config/cloudinary";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { mapGalleryImage } from "../../utils/mappers";
import type {
  CreateGalleryImageInput,
  ListGalleryQuery,
  UpdateGalleryImageInput,
  UploadGalleryImageInput,
} from "./gallery.schema";

export const listGallery = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListGalleryQuery;

  const where: Prisma.GalleryImageWhereInput = {};
  if (query.includeUnpublished !== "true") where.published = true;
  if (query.category) where.category = query.category;

  const images = await prisma.galleryImage.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: query.limit,
  });

  res.json({ data: images.map(mapGalleryImage) });
});

export const createGalleryImage = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateGalleryImageInput;

  const image = await prisma.galleryImage.create({
    data: {
      imageId: body.imageId,
      imageUrl: body.imageUrl ?? null,
      publicId: body.publicId ?? null,
      caption: body.caption,
      category: body.category,
      aspect: body.aspect,
      sortOrder: body.sortOrder,
      published: body.published,
    },
  });

  res.status(201).json({ data: mapGalleryImage(image) });
});

/**
 * Multipart upload → Cloudinary → gallery row.
 *
 * Multer keeps the file in memory (see gallery.routes.ts) because Render and
 * Railway containers have ephemeral, read-only-ish filesystems; streaming the
 * buffer straight to Cloudinary avoids any temp-file cleanup story entirely.
 */
export const uploadGalleryImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw AppError.badRequest("Attach an image under the `image` field.");

  const body = req.body as UploadGalleryImageInput;

  const uploaded = await uploadBuffer(file.buffer, { folder: "the-secret-kitchen/gallery" });

  // Aspect is inferred from the real dimensions when Cloudinary reports them,
  // so the masonry grid never gets a portrait tagged as landscape by mistake.
  const ratio = uploaded.height > 0 ? uploaded.width / uploaded.height : 1;
  const inferredAspect = ratio > 1.2 ? "LANDSCAPE" : ratio < 0.85 ? "PORTRAIT" : "SQUARE";

  const image = await prisma.galleryImage.create({
    data: {
      imageId: uploaded.publicId,
      imageUrl: uploaded.url,
      publicId: uploaded.publicId,
      caption: body.caption,
      category: body.category,
      aspect: body.aspect ?? inferredAspect,
      sortOrder: body.sortOrder,
    },
  });

  res.status(201).json({ data: mapGalleryImage(image), upload: uploaded });
});

export const updateGalleryImage = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateGalleryImageInput;
  const image = await prisma.galleryImage.update({
    where: { id: String(req.params.id) },
    data: body,
  });
  res.json({ data: mapGalleryImage(image) });
});

export const deleteGalleryImage = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) throw AppError.notFound("That image does not exist.");

  await prisma.galleryImage.delete({ where: { id } });
  // CDN cleanup is best-effort; the row is already gone either way.
  if (image.publicId) await destroyAsset(image.publicId);

  res.json({ message: "Image deleted." });
});
