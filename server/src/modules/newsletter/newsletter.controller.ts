import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { paginated, toSkipTake } from "../../utils/pagination";
import type {
  ListSubscribersQuery,
  SubscribeInput,
  UnsubscribeInput,
} from "./newsletter.schema";

/**
 * Idempotent by design: re-submitting a known address re-subscribes it rather
 * than 409-ing, because a duplicate-email error on a footer form is a confusing
 * dead end for someone who simply forgot they had signed up.
 */
export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SubscribeInput;

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: body.email },
    update: {
      subscribed: true,
      unsubscribedAt: null,
      ...(body.name ? { name: body.name } : {}),
    },
    create: {
      email: body.email,
      name: body.name ?? null,
      source: body.source ?? null,
    },
  });

  res.status(201).json({
    data: { email: subscriber.email },
    message: "You're on the list. Watch out for the weekly menu drop.",
  });
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as UnsubscribeInput;

  await prisma.newsletterSubscriber.updateMany({
    where: { email },
    data: { subscribed: false, unsubscribedAt: new Date() },
  });

  // Deliberately does not reveal whether the address was on the list.
  res.json({ message: "You have been unsubscribed." });
});

export const listSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSubscribersQuery;

  const where: Prisma.NewsletterSubscriberWhereInput = {};
  if (query.subscribed !== "all") where.subscribed = query.subscribed === "true";
  if (query.search) where.email = { contains: query.search, mode: "insensitive" };

  const { skip, take } = toSkipTake(query);
  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.newsletterSubscriber.count({ where }),
  ]);

  res.json(paginated(subscribers, total, query));
});
