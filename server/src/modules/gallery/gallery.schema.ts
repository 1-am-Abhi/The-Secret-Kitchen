import { z } from "zod";

export const galleryCategorySchema = z
  .enum(["dishes", "kitchen", "team", "packaging", "moments"])
  .transform(
    (value) => value.toUpperCase() as "DISHES" | "KITCHEN" | "TEAM" | "PACKAGING" | "MOMENTS",
  );

export const galleryAspectSchema = z
  .enum(["portrait", "landscape", "square"])
  .transform((value) => value.toUpperCase() as "PORTRAIT" | "LANDSCAPE" | "SQUARE");

export const listGalleryQuerySchema = z.object({
  category: galleryCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
  includeUnpublished: z.enum(["true", "false"]).default("false"),
});

export const createGalleryImageSchema = z.object({
  imageId: z.string().trim().min(1).max(120),
  imageUrl: z.string().url().nullable().optional(),
  publicId: z.string().trim().max(200).nullable().optional(),
  caption: z.string().trim().min(1).max(240),
  category: galleryCategorySchema,
  aspect: galleryAspectSchema.default("square"),
  sortOrder: z.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

export const updateGalleryImageSchema = createGalleryImageSchema.partial();

/** Multipart upload: the file arrives via multer, the rest as form fields. */
export const uploadGalleryImageSchema = z.object({
  caption: z.string().trim().min(1).max(240),
  category: galleryCategorySchema,
  aspect: galleryAspectSchema.default("square"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const galleryIdParamSchema = z.object({ id: z.string().trim().min(1) });

export type ListGalleryQuery = z.infer<typeof listGalleryQuerySchema>;
export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>;
export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;
export type UploadGalleryImageInput = z.infer<typeof uploadGalleryImageSchema>;
