import { Router } from "express";
import { z } from "zod";

import { business, commerce } from "../../config/commerce";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";

/**
 * Static-ish storefront content: FAQs and the commerce rule set. Exposing the
 * fee/threshold numbers over the API means the Next.js app can render the
 * "free delivery above ₹349" banner from the same source the bill is computed
 * from, instead of a second hardcoded copy drifting out of sync.
 */

const faqQuerySchema = z.object({
  category: z
    .enum(["ordering", "delivery", "tiffin", "food", "payments"])
    .transform((value) => value.toUpperCase() as "ORDERING" | "DELIVERY" | "TIFFIN" | "FOOD" | "PAYMENTS")
    .optional(),
});

export const contentRouter: Router = Router();

contentRouter.get(
  "/faqs",
  validate({ query: faqQuerySchema }),
  asyncHandler(async (req, res) => {
    const { category } = req.query as unknown as z.infer<typeof faqQuerySchema>;

    const faqs = await prisma.faq.findMany({
      where: { published: true, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    res.json({
      data: faqs.map((faq) => ({
        id: faq.code,
        question: faq.question,
        answer: faq.answer,
        category: faq.category.toLowerCase(),
      })),
    });
  }),
);

contentRouter.get("/config", (_req, res) => {
  res.json({
    commerce,
    business: { name: business.name, fssaiLicense: business.fssaiLicense },
  });
});
