import type { DeliveryArea, Outlet, Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import type {
  CoverageQuery,
  CreateDeliveryAreaInput,
  CreateOutletInput,
  ListOutletsQuery,
  UpdateDeliveryAreaInput,
  UpdateOutletInput,
} from "./outlets.schema";

/**
 * Outlet management.
 *
 * Delivery locations used to be a hardcoded array in the storefront, which
 * meant opening a kitchen required a deploy. They are rows now: an admin adds
 * an outlet, attaches its serviceable areas, and the storefront picks the
 * change up on its next revalidation with no code change anywhere.
 */

type OutletWithAreas = Outlet & { deliveryAreas: DeliveryArea[] };

function mapArea(area: DeliveryArea): Record<string, unknown> {
  return {
    id: area.id,
    outletId: area.outletId,
    name: area.name,
    pincode: area.pincode,
    etaMinutes: area.etaMinutes,
    freeDelivery: area.freeDelivery,
    active: area.active,
    sortOrder: area.sortOrder,
  };
}

function mapOutlet(outlet: OutletWithAreas): Record<string, unknown> {
  return {
    id: outlet.id,
    slug: outlet.slug,
    name: outlet.name,
    address: {
      line1: outlet.line1,
      line2: outlet.line2 ?? undefined,
      city: outlet.city,
      state: outlet.state,
      postalCode: outlet.postalCode,
      country: outlet.country,
    },
    phone: outlet.phone ?? undefined,
    email: outlet.email ?? undefined,
    latitude: outlet.latitude ?? undefined,
    longitude: outlet.longitude ?? undefined,
    deliveryRadiusKm: outlet.deliveryRadiusKm ?? undefined,
    deliveryMinutes: outlet.deliveryMinutes ?? undefined,
    opensAt: outlet.opensAt ?? undefined,
    closesAt: outlet.closesAt ?? undefined,
    active: outlet.active,
    sortOrder: outlet.sortOrder,
    deliveryAreas: outlet.deliveryAreas.map(mapArea),
  };
}

/** Strips `undefined` so a PATCH only touches the fields it actually sent. */
function definedOnly<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export const listOutlets = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOutletsQuery;
  // Disabled outlets and zones are operational state, not public information —
  // the flag only takes effect for an authenticated admin.
  const adminView = query.includeInactive === "true" && Boolean(req.admin);

  const outlets = await prisma.outlet.findMany({
    where: adminView ? {} : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      deliveryAreas: {
        // The storefront must never advertise a zone the kitchen has switched
        // off, so inactive areas are filtered out for everyone but the admin.
        where: adminView ? {} : { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  res.json({ data: outlets.map(mapOutlet) });
});

/**
 * "Do you deliver to me?" — matches on exact PIN code first, then on a
 * case-insensitive substring of the area or outlet city name.
 */
export const checkCoverage = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as unknown as CoverageQuery;
  const needle = q.trim();

  const area = await prisma.deliveryArea.findFirst({
    where: {
      active: true,
      outlet: { active: true },
      OR: [{ pincode: needle }, { name: { contains: needle, mode: "insensitive" } }],
    },
    orderBy: [{ sortOrder: "asc" }, { etaMinutes: "asc" }],
    include: { outlet: true },
  });

  if (!area) {
    res.json({ data: { covered: false, query: needle } });
    return;
  }

  res.json({
    data: {
      covered: true,
      query: needle,
      area: mapArea(area),
      outlet: { id: area.outlet.id, name: area.outlet.name, city: area.outlet.city },
    },
  });
});

export const createOutlet = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateOutletInput;

  const existing = await prisma.outlet.findUnique({ where: { slug: body.slug } });
  if (existing) throw AppError.conflict(`An outlet with the slug "${body.slug}" already exists.`);

  const outlet = await prisma.outlet.create({
    data: definedOnly(body) as Prisma.OutletCreateInput,
    include: { deliveryAreas: true },
  });

  res.status(201).json({ data: mapOutlet(outlet) });
});

export const updateOutlet = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateOutletInput;
  const id = String(req.params.id);

  const outlet = await prisma.outlet
    .update({
      where: { id },
      data: definedOnly(body),
      include: {
        deliveryAreas: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
    })
    .catch(() => {
      throw AppError.notFound("That outlet no longer exists.");
    });

  res.json({ data: mapOutlet(outlet) });
});

export const deleteOutlet = asyncHandler(async (req: Request, res: Response) => {
  await prisma.outlet.delete({ where: { id: String(req.params.id) } }).catch(() => {
    throw AppError.notFound("That outlet no longer exists.");
  });

  res.json({ message: "Outlet deleted." });
});

export const createDeliveryArea = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateDeliveryAreaInput;
  const outletId = String(req.params.id);

  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) throw AppError.notFound("That outlet no longer exists.");

  const duplicate = await prisma.deliveryArea.findFirst({
    where: { outletId, name: body.name },
  });
  if (duplicate) throw AppError.conflict(`"${body.name}" is already served by this outlet.`);

  const area = await prisma.deliveryArea.create({ data: { ...body, outletId } });

  res.status(201).json({ data: mapArea(area) });
});

export const updateDeliveryArea = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateDeliveryAreaInput;
  const { id: outletId, areaId } = req.params as { id: string; areaId: string };

  const existing = await prisma.deliveryArea.findFirst({ where: { id: areaId, outletId } });
  if (!existing) throw AppError.notFound("That delivery area no longer exists.");

  const area = await prisma.deliveryArea.update({
    where: { id: areaId },
    data: definedOnly(body),
  });

  res.json({ data: mapArea(area) });
});

export const deleteDeliveryArea = asyncHandler(async (req: Request, res: Response) => {
  const { id: outletId, areaId } = req.params as { id: string; areaId: string };

  const existing = await prisma.deliveryArea.findFirst({ where: { id: areaId, outletId } });
  if (!existing) throw AppError.notFound("That delivery area no longer exists.");

  await prisma.deliveryArea.delete({ where: { id: areaId } });

  res.json({ message: "Delivery area deleted." });
});
