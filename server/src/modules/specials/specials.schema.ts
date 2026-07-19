import { z } from "zod";

export const specialsQuerySchema = z.object({
  /** ISO date; defaults to today in the caller's absence. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional(),
  limit: z.coerce.number().int().min(1).max(12).default(4),
});

export const createSpecialSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  /** Menu item id or slug. */
  menuItem: z.string().trim().min(1),
  specialPrice: z.number().int().min(1).max(100_000).nullable().optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const updateSpecialSchema = createSpecialSchema.partial().omit({ menuItem: true });

export const specialIdParamSchema = z.object({ id: z.string().trim().min(1) });

export type SpecialsQuery = z.infer<typeof specialsQuerySchema>;
export type CreateSpecialInput = z.infer<typeof createSpecialSchema>;
export type UpdateSpecialInput = z.infer<typeof updateSpecialSchema>;
