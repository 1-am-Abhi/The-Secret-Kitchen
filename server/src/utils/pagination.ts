import { z } from "zod";

/** Shared list-endpoint pagination. Page is 1-based; `take` is capped at 100. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function toSkipTake({ page, limit }: Pagination): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

export function paginated<T>(data: T[], total: number, { page, limit }: Pagination): Paginated<T> {
  return { data, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}
