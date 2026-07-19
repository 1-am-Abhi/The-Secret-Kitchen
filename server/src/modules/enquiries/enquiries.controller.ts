import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginated, toSkipTake } from "../../utils/pagination";
import type {
  CreateEnquiryInput,
  ListEnquiriesQuery,
  UpdateEnquiryInput,
} from "./enquiries.schema";

export const createEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateEnquiryInput;

  // Honeypot hit: respond exactly as if it succeeded so the bot has no signal,
  // but write nothing.
  if (body.website) {
    res.status(201).json({ message: "Thanks! We'll be in touch shortly." });
    return;
  }

  const enquiry = await prisma.contactEnquiry.create({
    data: {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
    },
  });

  res.status(201).json({
    data: { id: enquiry.id },
    message: "Thanks! We'll be in touch shortly.",
  });
});

export const listEnquiries = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListEnquiriesQuery;

  const where: Prisma.ContactEnquiryWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { subject: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
    ];
  }

  const { skip, take } = toSkipTake(query);
  const [enquiries, total] = await Promise.all([
    // NEW first, then oldest-first within a status, so nothing sits unanswered.
    prisma.contactEnquiry.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.contactEnquiry.count({ where }),
  ]);

  res.json(paginated(enquiries, total, query));
});

export const updateEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateEnquiryInput;
  const enquiry = await prisma.contactEnquiry.update({
    where: { id: String(req.params.id) },
    data: body,
  });
  res.json({ data: enquiry });
});
