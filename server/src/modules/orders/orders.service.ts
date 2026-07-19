import type { AddOn, MenuItem, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { summariseBuild } from "../../data/tiffin-components";
import { AppError } from "../../utils/AppError";
import { type PricedLine } from "../../utils/pricing";
import type { CreateOrderInput } from "./orders.schema";

/**
 * Turns the client's cart into priced order lines using catalogue prices read
 * fresh from the database. Nothing about money in the request body is trusted —
 * the client only tells us WHAT it wants, never what it costs.
 */

export interface ResolvedLine extends PricedLine {
  menuItemId: string | null;
  name: string;
  slug: string;
  addOnLabels: string[];
  componentLabels: string[];
  isCustomTiffin: boolean;
  note: string | null;
  lineTotal: number;
}

type MenuItemWithAddOns = MenuItem & { addOns: AddOn[] };

export async function resolveOrderLines(items: CreateOrderInput["items"]): Promise<ResolvedLine[]> {
  const references = items
    .map((line) => line.itemId)
    .filter((reference): reference is string => Boolean(reference));

  const catalogue: MenuItemWithAddOns[] = references.length
    ? await prisma.menuItem.findMany({
        where: {
          OR: [{ id: { in: references } }, { slug: { in: references } }, { code: { in: references } }],
        },
        include: { addOns: true },
      })
    : [];

  // A dish can be referenced by id, slug or catalogue code; index all three.
  const byReference = new Map<string, MenuItemWithAddOns>();
  for (const item of catalogue) {
    byReference.set(item.id, item);
    byReference.set(item.slug, item);
    byReference.set(item.code, item);
  }

  return items.map((line) => {
    if (line.isCustomTiffin) {
      const build = summariseBuild(line.componentIds);
      if (!build.itemCount) {
        throw AppError.badRequest("A custom tiffin needs at least one component.");
      }
      // The builder's own bulk discount is baked into the unit price rather
      // than surfaced as a cart-level discount, matching the storefront.
      const unitPrice = build.total;
      return {
        menuItemId: null,
        name: line.name?.trim() || "Custom Tiffin Box",
        slug: "custom-tiffin",
        unitPrice,
        quantity: line.quantity,
        addOnTotal: 0,
        addOnLabels: [],
        componentLabels: build.labels,
        isCustomTiffin: true,
        note: line.note ?? null,
        lineTotal: unitPrice * line.quantity,
      };
    }

    const item = byReference.get(line.itemId as string);
    if (!item) throw AppError.badRequest(`We could not find the dish "${line.itemId}".`);
    if (!item.available) throw AppError.conflict(`${item.name} is currently unavailable.`);

    const chosen = item.addOns.filter((addOn) => line.addOnIds.includes(addOn.code));
    const unknown = line.addOnIds.filter(
      (code) => !item.addOns.some((addOn) => addOn.code === code),
    );
    if (unknown.length) {
      throw AppError.badRequest(`Unknown add-on(s) for ${item.name}: ${unknown.join(", ")}.`);
    }

    const addOnTotal = chosen.reduce((sum, addOn) => sum + addOn.price, 0);

    return {
      menuItemId: item.id,
      name: item.name,
      slug: item.slug,
      unitPrice: item.price,
      quantity: line.quantity,
      addOnTotal,
      addOnLabels: chosen.map((addOn) => addOn.label),
      componentLabels: [],
      isCustomTiffin: false,
      note: line.note ?? null,
      lineTotal: (item.price + addOnTotal) * line.quantity,
    };
  });
}

/**
 * Upserts the customer by phone — the identity for a cloud kitchen, where most
 * people order as guests and never create an account. A returning number keeps
 * its order history automatically.
 */
export async function upsertCustomer(
  tx: Prisma.TransactionClient,
  customer: CreateOrderInput["customer"],
): Promise<{ id: string }> {
  return tx.customer.upsert({
    where: { phone: customer.phone },
    // Only fill in an email we did not already have; never blank one out.
    update: { name: customer.name, ...(customer.email ? { email: customer.email } : {}) },
    create: { name: customer.name, phone: customer.phone, email: customer.email ?? null },
    select: { id: true },
  });
}

/** Reuses an identical saved address rather than accumulating duplicates. */
export async function resolveAddress(
  tx: Prisma.TransactionClient,
  customerId: string,
  address: CreateOrderInput["address"],
): Promise<string | null> {
  if (!address.save) return null;

  const existing = await tx.address.findFirst({
    where: { customerId, line1: address.line1, pincode: address.pincode },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.address.create({
    data: {
      customerId,
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? null,
      landmark: address.landmark ?? null,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Legal status transitions. A delivered or cancelled order is terminal: letting
 * an admin walk one back would corrupt revenue reporting, which counts
 * DELIVERED rows.
 */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function assertTransition(from: string, to: string): void {
  if (from === to) return;
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw AppError.conflict(`An order cannot move from ${from} to ${to}.`);
  }
}
