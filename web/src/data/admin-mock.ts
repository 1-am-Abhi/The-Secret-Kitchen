import { siteConfig } from "@/config/site";
import { itemById, menuItems } from "@/data/menu";
import type { BillingCycle, CategorySlug, MealSlot, PlanTier } from "@/types";

/**
 * OPERATIONAL MOCK DATA — admin panel only.
 *
 * Everything here is deterministic on purpose: no `Math.random()`, no
 * `new Date()` at module scope. Both would make the server render and the
 * client hydration disagree, and would make builds irreproducible. Dates are
 * fixed ISO strings anchored to `TODAY`; any "randomness" comes from a seeded
 * hash so the same input always produces the same figure.
 *
 * When the Express API lands, every export below is replaced by a fetch that
 * returns the same shape — the pages never construct data themselves.
 */

/** The kitchen's "current day". Every relative date in the panel derives from it. */
export const TODAY = "2026-07-19";

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

/** FNV-1a — a stable integer hash used to vary mock figures without randomness. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic integer in [min, max] derived from a seed string. */
function seeded(seed: string, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1));
}

/** Shift an ISO date (YYYY-MM-DD) by whole days without touching module scope clocks. */
export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const stamp = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(stamp).toISOString().slice(0, 10);
}

/** "2026-07-19" + "13:45" → a full ISO timestamp in IST-neutral UTC form. */
function at(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

/* ========================================================================== */
/*  Orders                                                                    */
/* ========================================================================== */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "upi" | "card" | "cod" | "wallet";
export type PaymentStatus = "paid" | "pending" | "refunded";
export type OrderChannel = "website" | "whatsapp" | "phone";

export interface AdminOrderLine {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AdminOrder {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  addressLine: string;
  area: string;
  placedAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  channel: OrderChannel;
  items: AdminOrderLine[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  gst: number;
  discount: number;
  total: number;
  couponCode?: string;
  note?: string;
  /** Minutes from placement to doorstep. Only present once delivered. */
  fulfilmentMinutes?: number;
}

/** Ordered lifecycle — drives the "advance status" action in the orders table. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out-for-delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The next status in the flow, or null when the order is already terminal. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}

type OrderSeed = {
  id: string;
  customer: number;
  /** Days before TODAY the order was placed. */
  daysAgo: number;
  time: string;
  status: OrderStatus;
  payment: PaymentMethod;
  channel: OrderChannel;
  /** [menu item id, quantity] pairs. */
  lines: [string, number][];
  coupon?: string;
  note?: string;
};

const ORDER_SEEDS: OrderSeed[] = [
  { id: "TSK-24501", customer: 0, daysAgo: 0, time: "13:42", status: "pending", payment: "upi", channel: "website", lines: [["nin-06", 1], ["par-02", 4], ["ric-01", 1]] },
  { id: "TSK-24500", customer: 4, daysAgo: 0, time: "13:28", status: "pending", payment: "cod", channel: "whatsapp", lines: [["mag-05", 2], ["bev-01", 2]], note: "Extra cheese, ring the bell twice" },
  { id: "TSK-24499", customer: 7, daysAgo: 0, time: "13:15", status: "confirmed", payment: "upi", channel: "website", lines: [["pas-02", 1], ["snk-01", 1], ["bev-06", 1]] },
  { id: "TSK-24498", customer: 2, daysAgo: 0, time: "13:04", status: "preparing", payment: "card", channel: "website", lines: [["nin-05", 1], ["nin-02", 1], ["par-05", 2], ["des-02", 2]], coupon: "SECRET50" },
  { id: "TSK-24497", customer: 11, daysAgo: 0, time: "12:52", status: "preparing", payment: "upi", channel: "website", lines: [["snk-06", 1], ["ric-05", 1]] },
  { id: "TSK-24496", customer: 15, daysAgo: 0, time: "12:40", status: "out-for-delivery", payment: "wallet", channel: "phone", lines: [["idl-02", 2], ["bev-03", 2]] },
  { id: "TSK-24495", customer: 3, daysAgo: 0, time: "12:26", status: "out-for-delivery", payment: "upi", channel: "website", lines: [["nin-08", 1], ["ric-02", 1], ["par-01", 4]] },
  { id: "TSK-24494", customer: 9, daysAgo: 0, time: "12:11", status: "delivered", payment: "upi", channel: "website", lines: [["par-04", 2], ["bev-04", 1]] },
  { id: "TSK-24493", customer: 18, daysAgo: 0, time: "11:55", status: "delivered", payment: "cod", channel: "whatsapp", lines: [["snk-04", 2], ["snk-07", 1], ["bev-05", 2]] },
  { id: "TSK-24492", customer: 6, daysAgo: 0, time: "11:34", status: "cancelled", payment: "upi", channel: "website", lines: [["pas-05", 1]], note: "Customer cancelled — ordered by mistake" },
  { id: "TSK-24491", customer: 1, daysAgo: 0, time: "10:48", status: "delivered", payment: "card", channel: "website", lines: [["san-03", 2], ["bev-01", 1]] },
  { id: "TSK-24490", customer: 21, daysAgo: 0, time: "09:30", status: "delivered", payment: "upi", channel: "website", lines: [["idl-01", 2], ["bev-02", 2]] },

  { id: "TSK-24489", customer: 5, daysAgo: 1, time: "21:12", status: "delivered", payment: "upi", channel: "website", lines: [["nin-06", 1], ["nin-03", 1], ["par-03", 6], ["des-01", 2]], coupon: "FAMILY100" },
  { id: "TSK-24488", customer: 13, daysAgo: 1, time: "20:44", status: "delivered", payment: "cod", channel: "phone", lines: [["ric-04", 2], ["snk-03", 1]] },
  { id: "TSK-24487", customer: 8, daysAgo: 1, time: "20:03", status: "delivered", payment: "wallet", channel: "website", lines: [["bur-02", 2], ["snk-02", 1], ["bev-06", 2]] },
  { id: "TSK-24486", customer: 16, daysAgo: 1, time: "19:37", status: "delivered", payment: "upi", channel: "website", lines: [["nin-07", 1], ["ric-01", 1], ["par-02", 4]] },
  { id: "TSK-24485", customer: 22, daysAgo: 1, time: "14:22", status: "delivered", payment: "upi", channel: "whatsapp", lines: [["mag-07", 1], ["mag-02", 1], ["bev-03", 2]] },
  { id: "TSK-24484", customer: 10, daysAgo: 1, time: "13:50", status: "delivered", payment: "card", channel: "website", lines: [["pas-06", 1], ["snk-01", 1]] },
  { id: "TSK-24483", customer: 19, daysAgo: 1, time: "13:11", status: "cancelled", payment: "cod", channel: "phone", lines: [["nin-09", 1], ["par-01", 4]], note: "Address outside delivery radius" },
  { id: "TSK-24482", customer: 24, daysAgo: 1, time: "12:35", status: "delivered", payment: "upi", channel: "website", lines: [["nin-01", 1], ["ric-02", 1], ["des-04", 1]] },

  { id: "TSK-24481", customer: 12, daysAgo: 2, time: "21:05", status: "delivered", payment: "upi", channel: "website", lines: [["nin-02", 1], ["par-05", 2], ["des-03", 1]], coupon: "SECRET50" },
  { id: "TSK-24480", customer: 0, daysAgo: 2, time: "20:20", status: "delivered", payment: "upi", channel: "website", lines: [["san-01", 2], ["snk-01", 1], ["bev-05", 2]] },
  { id: "TSK-24479", customer: 17, daysAgo: 2, time: "19:48", status: "delivered", payment: "wallet", channel: "website", lines: [["ric-03", 1], ["nin-04", 1]] },
  { id: "TSK-24478", customer: 20, daysAgo: 2, time: "14:05", status: "delivered", payment: "cod", channel: "whatsapp", lines: [["mag-05", 3], ["bev-01", 3]] },
  { id: "TSK-24477", customer: 14, daysAgo: 2, time: "13:26", status: "delivered", payment: "card", channel: "website", lines: [["pas-03", 1], ["san-02", 1], ["des-02", 1]] },
  { id: "TSK-24476", customer: 23, daysAgo: 2, time: "12:44", status: "delivered", payment: "upi", channel: "website", lines: [["idl-03", 2], ["bev-04", 2]] },

  { id: "TSK-24475", customer: 2, daysAgo: 3, time: "20:58", status: "delivered", payment: "upi", channel: "website", lines: [["nin-05", 2], ["par-06", 2], ["ric-01", 1], ["des-01", 4]], coupon: "FAMILY100" },
  { id: "TSK-24474", customer: 6, daysAgo: 3, time: "19:30", status: "delivered", payment: "upi", channel: "website", lines: [["snk-06", 1], ["snk-07", 1], ["bev-06", 2]] },
  { id: "TSK-24473", customer: 9, daysAgo: 3, time: "13:58", status: "delivered", payment: "cod", channel: "phone", lines: [["par-04", 3], ["bev-03", 3]] },
  { id: "TSK-24472", customer: 15, daysAgo: 3, time: "12:19", status: "cancelled", payment: "upi", channel: "website", lines: [["pas-02", 1], ["bev-01", 1]], note: "Payment failed twice" },

  { id: "TSK-24471", customer: 3, daysAgo: 4, time: "21:22", status: "delivered", payment: "card", channel: "website", lines: [["nin-06", 1], ["nin-08", 1], ["par-02", 6], ["ric-02", 1]] },
  { id: "TSK-24470", customer: 11, daysAgo: 4, time: "20:11", status: "delivered", payment: "upi", channel: "website", lines: [["bur-01", 2], ["snk-01", 2]] },
  { id: "TSK-24469", customer: 7, daysAgo: 4, time: "13:40", status: "delivered", payment: "wallet", channel: "website", lines: [["ric-05", 1], ["snk-04", 1]] },
  { id: "TSK-24468", customer: 1, daysAgo: 4, time: "09:52", status: "delivered", payment: "upi", channel: "website", lines: [["idl-01", 3], ["bev-02", 3]] },

  { id: "TSK-24467", customer: 5, daysAgo: 5, time: "20:36", status: "delivered", payment: "upi", channel: "website", lines: [["nin-02", 1], ["nin-07", 1], ["par-03", 6], ["des-02", 2]], coupon: "SECRET50" },
  { id: "TSK-24466", customer: 18, daysAgo: 5, time: "19:14", status: "delivered", payment: "cod", channel: "whatsapp", lines: [["mag-04", 2], ["bev-05", 2]] },
  { id: "TSK-24465", customer: 13, daysAgo: 5, time: "13:33", status: "delivered", payment: "upi", channel: "website", lines: [["pas-04", 1], ["san-03", 1]] },

  { id: "TSK-24464", customer: 8, daysAgo: 6, time: "21:02", status: "delivered", payment: "upi", channel: "website", lines: [["nin-05", 1], ["ric-03", 1], ["des-03", 2]] },
  { id: "TSK-24463", customer: 16, daysAgo: 6, time: "19:47", status: "delivered", payment: "card", channel: "website", lines: [["snk-05", 2], ["snk-02", 1], ["bev-06", 1]] },
  { id: "TSK-24462", customer: 22, daysAgo: 6, time: "12:58", status: "delivered", payment: "upi", channel: "website", lines: [["mag-06", 2], ["bev-03", 2], ["des-04", 1]] },
];

const COUPON_DISCOUNT: Record<string, number> = {
  SECRET50: 150,
  FAMILY100: 100,
  TIFFIN15: 0,
};

function buildOrder(seed: OrderSeed): AdminOrder {
  const customer = CUSTOMER_SEEDS[seed.customer];

  const items: AdminOrderLine[] = seed.lines.map(([itemId, quantity]) => {
    const item = itemById.get(itemId);
    const unitPrice = item?.price ?? 99;
    return {
      itemId,
      name: item?.name ?? "Kitchen special",
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const subtotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = seed.coupon ? Math.min(COUPON_DISCOUNT[seed.coupon] ?? 0, subtotal) : 0;
  const deliveryFee =
    subtotal - discount >= siteConfig.commerce.freeDeliveryAbove
      ? 0
      : siteConfig.commerce.deliveryFee;
  const packagingFee = siteConfig.commerce.packagingFee;
  const gst = Math.round((subtotal - discount) * siteConfig.commerce.gstRate);
  const total = subtotal - discount + deliveryFee + packagingFee + gst;

  const date = shiftDate(TODAY, -seed.daysAgo);

  return {
    id: seed.id,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    addressLine: customer.addressLine,
    area: customer.area,
    placedAt: at(date, seed.time),
    status: seed.status,
    paymentMethod: seed.payment,
    paymentStatus:
      seed.status === "cancelled" ? "refunded" : seed.payment === "cod" ? "pending" : "paid",
    channel: seed.channel,
    items,
    subtotal,
    deliveryFee,
    packagingFee,
    gst,
    discount,
    total,
    couponCode: seed.coupon,
    note: seed.note,
    fulfilmentMinutes:
      seed.status === "delivered" ? seeded(`${seed.id}-eta`, 22, 48) : undefined,
  };
}

/* ========================================================================== */
/*  Customers                                                                 */
/* ========================================================================== */

export type CustomerSegment = "new" | "regular" | "vip";

export interface AdminCustomer {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  addressLine: string;
  area: string;
  joinedAt: string;
  lastOrderAt: string;
  orderCount: number;
  lifetimeValue: number;
  segment: CustomerSegment;
  /** Set when the customer also holds a tiffin subscription. */
  subscriptionId?: string;
  favouriteItemId: string;
  notes?: string;
}

type CustomerSeed = {
  id: string;
  name: string;
  phone: string;
  email: string;
  addressLine: string;
  area: string;
  joinedDaysAgo: number;
  lastOrderDaysAgo: number;
  orderCount: number;
  lifetimeValue: number;
  favouriteItemId: string;
  subscriptionId?: string;
  notes?: string;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function segmentOf(orderCount: number, lifetimeValue: number): CustomerSegment {
  if (lifetimeValue >= 18_000 || orderCount >= 45) return "vip";
  if (orderCount >= 6) return "regular";
  return "new";
}

const CUSTOMER_SEEDS: CustomerSeed[] = [
  { id: "CUS-1001", name: "Aarav Sharma", phone: "+91 98110 24567", email: "aarav.sharma@gmail.com", addressLine: "B-402, Amrapali Silicon City", area: "Sector 76, Noida", joinedDaysAgo: 612, lastOrderDaysAgo: 0, orderCount: 84, lifetimeValue: 46_820, favouriteItemId: "nin-06", subscriptionId: "SUB-2001", notes: "Prefers low-spice. Always tips the rider." },
  { id: "CUS-1002", name: "Priya Nair", phone: "+91 99102 78345", email: "priya.nair@outlook.com", addressLine: "C-14, Sunrise Apartments", area: "Sector 62, Noida", joinedDaysAgo: 495, lastOrderDaysAgo: 0, orderCount: 61, lifetimeValue: 31_240, favouriteItemId: "idl-01", subscriptionId: "SUB-2002" },
  { id: "CUS-1003", name: "Rohan Mehta", phone: "+91 98735 11290", email: "rohan.mehta@gmail.com", addressLine: "Flat 907, Cleo County Tower 3", area: "Sector 121, Noida", joinedDaysAgo: 430, lastOrderDaysAgo: 0, orderCount: 72, lifetimeValue: 52_690, favouriteItemId: "nin-05", subscriptionId: "SUB-2003", notes: "Corporate account — invoices to Mehta Consulting." },
  { id: "CUS-1004", name: "Ananya Iyer", phone: "+91 97186 40023", email: "ananya.iyer@gmail.com", addressLine: "D-208, Paras Tierea", area: "Sector 137, Noida", joinedDaysAgo: 388, lastOrderDaysAgo: 0, orderCount: 39, lifetimeValue: 19_450, favouriteItemId: "nin-08", subscriptionId: "SUB-2004" },
  { id: "CUS-1005", name: "Vikram Singh", phone: "+91 98218 66714", email: "vikram.singh@yahoo.in", addressLine: "H-3, Sector 15A Market Lane", area: "Sector 15, Noida", joinedDaysAgo: 356, lastOrderDaysAgo: 0, orderCount: 28, lifetimeValue: 12_880, favouriteItemId: "mag-05" },
  { id: "CUS-1006", name: "Sneha Kulkarni", phone: "+91 99716 32908", email: "sneha.k@gmail.com", addressLine: "A-1104, Supertech Cape Town", area: "Sector 74, Noida", joinedDaysAgo: 344, lastOrderDaysAgo: 1, orderCount: 55, lifetimeValue: 34_110, favouriteItemId: "nin-02", subscriptionId: "SUB-2005" },
  { id: "CUS-1007", name: "Karthik Reddy", phone: "+91 98450 27731", email: "karthik.reddy@gmail.com", addressLine: "E-06, Logix Blossom County", area: "Sector 137, Noida", joinedDaysAgo: 298, lastOrderDaysAgo: 0, orderCount: 21, lifetimeValue: 9_760, favouriteItemId: "snk-06" },
  { id: "CUS-1008", name: "Meera Joshi", phone: "+91 99584 10366", email: "meera.joshi@gmail.com", addressLine: "F-702, Gaur City 2", area: "Greater Noida West", joinedDaysAgo: 271, lastOrderDaysAgo: 0, orderCount: 33, lifetimeValue: 16_240, favouriteItemId: "pas-02", subscriptionId: "SUB-2006" },
  { id: "CUS-1009", name: "Arjun Patel", phone: "+91 97027 88451", email: "arjun.patel@gmail.com", addressLine: "G-505, Mahagun Moderne", area: "Sector 78, Noida", joinedDaysAgo: 254, lastOrderDaysAgo: 1, orderCount: 44, lifetimeValue: 27_930, favouriteItemId: "bur-02" },
  { id: "CUS-1010", name: "Divya Menon", phone: "+91 98604 55172", email: "divya.menon@gmail.com", addressLine: "202, Shivalik Residency", area: "Sector 50, Noida", joinedDaysAgo: 232, lastOrderDaysAgo: 0, orderCount: 26, lifetimeValue: 11_470, favouriteItemId: "par-04", subscriptionId: "SUB-2007" },
  { id: "CUS-1011", name: "Rahul Verma", phone: "+91 99993 41208", email: "rahul.verma@gmail.com", addressLine: "T4-1802, Ace City", area: "Greater Noida West", joinedDaysAgo: 208, lastOrderDaysAgo: 1, orderCount: 18, lifetimeValue: 8_320, favouriteItemId: "pas-06" },
  { id: "CUS-1012", name: "Ishita Banerjee", phone: "+91 98307 22984", email: "ishita.b@gmail.com", addressLine: "B-9, Jalvayu Vihar", area: "Sector 25, Noida", joinedDaysAgo: 186, lastOrderDaysAgo: 0, orderCount: 30, lifetimeValue: 14_680, favouriteItemId: "snk-06", subscriptionId: "SUB-2008" },
  { id: "CUS-1013", name: "Siddharth Rao", phone: "+91 90084 71135", email: "sid.rao@gmail.com", addressLine: "1204, Prateek Wisteria", area: "Sector 77, Noida", joinedDaysAgo: 171, lastOrderDaysAgo: 2, orderCount: 24, lifetimeValue: 13_940, favouriteItemId: "nin-02" },
  { id: "CUS-1014", name: "Neha Gupta", phone: "+91 98915 30447", email: "neha.gupta@gmail.com", addressLine: "C-77, Sector 44 Colony", area: "Sector 44, Noida", joinedDaysAgo: 158, lastOrderDaysAgo: 1, orderCount: 19, lifetimeValue: 9_110, favouriteItemId: "ric-04", subscriptionId: "SUB-2009" },
  { id: "CUS-1015", name: "Aditya Chauhan", phone: "+91 97177 90562", email: "aditya.chauhan@gmail.com", addressLine: "S-11, Sector 18 Atta Market", area: "Sector 18, Noida", joinedDaysAgo: 141, lastOrderDaysAgo: 2, orderCount: 15, lifetimeValue: 7_260, favouriteItemId: "pas-03" },
  { id: "CUS-1016", name: "Pooja Deshmukh", phone: "+91 99201 64873", email: "pooja.d@gmail.com", addressLine: "A-303, Eldeco Utopia", area: "Sector 93A, Noida", joinedDaysAgo: 124, lastOrderDaysAgo: 0, orderCount: 22, lifetimeValue: 12_050, favouriteItemId: "idl-02", subscriptionId: "SUB-2010" },
  { id: "CUS-1017", name: "Manish Agarwal", phone: "+91 98189 77394", email: "manish.agarwal@gmail.com", addressLine: "P-18, Sector 63 Industrial Area", area: "Sector 63, Noida", joinedDaysAgo: 112, lastOrderDaysAgo: 1, orderCount: 17, lifetimeValue: 10_390, favouriteItemId: "nin-07", notes: "Bulk office lunches on Fridays." },
  { id: "CUS-1018", name: "Kavya Krishnan", phone: "+91 96500 23718", email: "kavya.k@gmail.com", addressLine: "F-12, Antriksh Golf View", area: "Sector 78, Noida", joinedDaysAgo: 96, lastOrderDaysAgo: 2, orderCount: 13, lifetimeValue: 6_420, favouriteItemId: "ric-03", subscriptionId: "SUB-2011" },
  { id: "CUS-1019", name: "Nikhil Bhatt", phone: "+91 98997 41260", email: "nikhil.bhatt@gmail.com", addressLine: "R-4, Hoshiyarpur Village Road", area: "Sector 51, Noida", joinedDaysAgo: 84, lastOrderDaysAgo: 0, orderCount: 11, lifetimeValue: 5_180, favouriteItemId: "snk-04" },
  { id: "CUS-1020", name: "Riya Malhotra", phone: "+91 99118 50632", email: "riya.malhotra@gmail.com", addressLine: "B-505, Nirala Estate", area: "Greater Noida West", joinedDaysAgo: 71, lastOrderDaysAgo: 1, orderCount: 9, lifetimeValue: 4_310, favouriteItemId: "nin-09", subscriptionId: "SUB-2012" },
  { id: "CUS-1021", name: "Sameer Qureshi", phone: "+91 97114 08825", email: "sameer.q@gmail.com", addressLine: "L-31, Sector 27 Market", area: "Sector 27, Noida", joinedDaysAgo: 58, lastOrderDaysAgo: 2, orderCount: 8, lifetimeValue: 3_960, favouriteItemId: "mag-05" },
  { id: "CUS-1022", name: "Tanvi Shah", phone: "+91 98336 71904", email: "tanvi.shah@gmail.com", addressLine: "A-2, Sector 12 Housing Board", area: "Sector 12, Noida", joinedDaysAgo: 44, lastOrderDaysAgo: 0, orderCount: 6, lifetimeValue: 2_740, favouriteItemId: "idl-01", subscriptionId: "SUB-2013" },
  { id: "CUS-1023", name: "Harsh Vardhan", phone: "+91 90136 28571", email: "harsh.vardhan@gmail.com", addressLine: "D-9, Sector 128 Jaypee Greens", area: "Sector 128, Noida", joinedDaysAgo: 31, lastOrderDaysAgo: 1, orderCount: 5, lifetimeValue: 2_180, favouriteItemId: "mag-07" },
  { id: "CUS-1024", name: "Lakshmi Pillai", phone: "+91 98470 33612", email: "lakshmi.pillai@gmail.com", addressLine: "C-6, Sector 100 Lotus Panache", area: "Sector 100, Noida", joinedDaysAgo: 19, lastOrderDaysAgo: 2, orderCount: 3, lifetimeValue: 1_290, favouriteItemId: "idl-03", subscriptionId: "SUB-2014" },
  { id: "CUS-1025", name: "Gaurav Saxena", phone: "+91 99586 12047", email: "gaurav.saxena@gmail.com", addressLine: "E-22, Sector 34 Metro Lane", area: "Sector 34, Noida", joinedDaysAgo: 8, lastOrderDaysAgo: 1, orderCount: 2, lifetimeValue: 780, favouriteItemId: "nin-01" },
];

export const adminCustomers: AdminCustomer[] = CUSTOMER_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  initials: initialsOf(seed.name),
  phone: seed.phone,
  email: seed.email,
  addressLine: seed.addressLine,
  area: seed.area,
  joinedAt: shiftDate(TODAY, -seed.joinedDaysAgo),
  lastOrderAt: shiftDate(TODAY, -seed.lastOrderDaysAgo),
  orderCount: seed.orderCount,
  lifetimeValue: seed.lifetimeValue,
  segment: segmentOf(seed.orderCount, seed.lifetimeValue),
  subscriptionId: seed.subscriptionId,
  favouriteItemId: seed.favouriteItemId,
  notes: seed.notes,
}));

export const customerById = new Map(adminCustomers.map((c) => [c.id, c]));

export const adminOrders: AdminOrder[] = ORDER_SEEDS.map(buildOrder);

export const orderById = new Map(adminOrders.map((o) => [o.id, o]));

/* ========================================================================== */
/*  Tiffin subscriptions                                                      */
/* ========================================================================== */

export type AdminSubscriptionStatus = "active" | "paused" | "cancelled";

export interface AdminSubscription {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  area: string;
  planTier: PlanTier;
  cycle: Exclude<BillingCycle, "custom">;
  slot: MealSlot;
  status: AdminSubscriptionStatus;
  startedAt: string;
  renewsAt: string;
  nextDeliveryDate: string;
  mealsRemaining: number;
  mealsPerCycle: number;
  monthlyValue: number;
  skippedDates: string[];
  addressLabel: string;
  /** Populated only while paused. */
  pausedUntil?: string;
}

type SubscriptionSeed = {
  id: string;
  customer: number;
  planTier: PlanTier;
  cycle: Exclude<BillingCycle, "custom">;
  slot: MealSlot;
  status: AdminSubscriptionStatus;
  startedDaysAgo: number;
  renewsInDays: number;
  mealsRemaining: number;
  monthlyValue: number;
  addressLabel: string;
  skipInDays?: number[];
  pausedForDays?: number;
};

const SUBSCRIPTION_SEEDS: SubscriptionSeed[] = [
  { id: "SUB-2001", customer: 0, planTier: "premium", cycle: "monthly", slot: "both", status: "active", startedDaysAgo: 412, renewsInDays: 11, mealsRemaining: 19, monthlyValue: 9_308, addressLabel: "Home · Sector 76", skipInDays: [4] },
  { id: "SUB-2002", customer: 1, planTier: "regular", cycle: "monthly", slot: "lunch", status: "active", startedDaysAgo: 366, renewsInDays: 6, mealsRemaining: 9, monthlyValue: 3_354, addressLabel: "Office · Sector 62" },
  { id: "SUB-2003", customer: 2, planTier: "premium", cycle: "monthly", slot: "both", status: "active", startedDaysAgo: 341, renewsInDays: 21, mealsRemaining: 38, monthlyValue: 9_308, addressLabel: "Office · Cleo County" },
  { id: "SUB-2004", customer: 3, planTier: "regular", cycle: "monthly", slot: "dinner", status: "active", startedDaysAgo: 288, renewsInDays: 14, mealsRemaining: 17, monthlyValue: 3_354, addressLabel: "Home · Paras Tierea", skipInDays: [2, 3] },
  { id: "SUB-2005", customer: 5, planTier: "premium", cycle: "monthly", slot: "lunch", status: "active", startedDaysAgo: 264, renewsInDays: 3, mealsRemaining: 4, monthlyValue: 4_654, addressLabel: "Home · Cape Town" },
  { id: "SUB-2006", customer: 7, planTier: "regular", cycle: "weekly", slot: "lunch", status: "active", startedDaysAgo: 198, renewsInDays: 2, mealsRemaining: 3, monthlyValue: 870, addressLabel: "Home · Gaur City 2" },
  { id: "SUB-2007", customer: 9, planTier: "student", cycle: "monthly", slot: "dinner", status: "paused", startedDaysAgo: 176, renewsInDays: 18, mealsRemaining: 12, monthlyValue: 2_314, addressLabel: "PG · Sector 50", pausedForDays: 9 },
  { id: "SUB-2008", customer: 11, planTier: "regular", cycle: "monthly", slot: "both", status: "active", startedDaysAgo: 154, renewsInDays: 9, mealsRemaining: 22, monthlyValue: 6_708, addressLabel: "Home · Jalvayu Vihar" },
  { id: "SUB-2009", customer: 13, planTier: "student", cycle: "monthly", slot: "lunch", status: "active", startedDaysAgo: 138, renewsInDays: 16, mealsRemaining: 14, monthlyValue: 2_314, addressLabel: "Hostel · Sector 44", skipInDays: [5, 6] },
  { id: "SUB-2010", customer: 15, planTier: "premium", cycle: "monthly", slot: "dinner", status: "active", startedDaysAgo: 116, renewsInDays: 5, mealsRemaining: 6, monthlyValue: 4_654, addressLabel: "Home · Eldeco Utopia" },
  { id: "SUB-2011", customer: 17, planTier: "student", cycle: "weekly", slot: "lunch", status: "paused", startedDaysAgo: 92, renewsInDays: 4, mealsRemaining: 2, monthlyValue: 594, addressLabel: "Hostel · Antriksh", pausedForDays: 4 },
  { id: "SUB-2012", customer: 19, planTier: "regular", cycle: "monthly", slot: "lunch", status: "active", startedDaysAgo: 68, renewsInDays: 24, mealsRemaining: 25, monthlyValue: 3_354, addressLabel: "Home · Nirala Estate" },
  { id: "SUB-2013", customer: 21, planTier: "student", cycle: "monthly", slot: "both", status: "active", startedDaysAgo: 41, renewsInDays: 12, mealsRemaining: 21, monthlyValue: 4_628, addressLabel: "PG · Sector 12" },
  { id: "SUB-2014", customer: 23, planTier: "regular", cycle: "weekly", slot: "dinner", status: "active", startedDaysAgo: 17, renewsInDays: 1, mealsRemaining: 1, monthlyValue: 870, addressLabel: "Home · Lotus Panache" },
  { id: "SUB-2015", customer: 4, planTier: "regular", cycle: "monthly", slot: "lunch", status: "cancelled", startedDaysAgo: 224, renewsInDays: -12, mealsRemaining: 0, monthlyValue: 3_354, addressLabel: "Home · Sector 15" },
  { id: "SUB-2016", customer: 10, planTier: "student", cycle: "monthly", slot: "dinner", status: "cancelled", startedDaysAgo: 152, renewsInDays: -28, mealsRemaining: 0, monthlyValue: 2_314, addressLabel: "PG · Ace City" },
  { id: "SUB-2017", customer: 16, planTier: "premium", cycle: "monthly", slot: "both", status: "active", startedDaysAgo: 104, renewsInDays: 8, mealsRemaining: 31, monthlyValue: 9_308, addressLabel: "Office · Sector 63" },
  { id: "SUB-2018", customer: 20, planTier: "student", cycle: "weekly", slot: "lunch", status: "active", startedDaysAgo: 26, renewsInDays: 3, mealsRemaining: 4, monthlyValue: 594, addressLabel: "PG · Sector 27" },
];

const MEALS_PER_CYCLE: Record<Exclude<BillingCycle, "custom">, number> = {
  monthly: 26,
  weekly: 6,
};

export const adminSubscriptions: AdminSubscription[] = SUBSCRIPTION_SEEDS.map((seed) => {
  const customer = CUSTOMER_SEEDS[seed.customer];
  return {
    id: seed.id,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    area: customer.area,
    planTier: seed.planTier,
    cycle: seed.cycle,
    slot: seed.slot,
    status: seed.status,
    startedAt: shiftDate(TODAY, -seed.startedDaysAgo),
    renewsAt: shiftDate(TODAY, seed.renewsInDays),
    nextDeliveryDate:
      seed.status === "active" ? shiftDate(TODAY, 1) : shiftDate(TODAY, seed.pausedForDays ?? 0),
    mealsRemaining: seed.mealsRemaining,
    mealsPerCycle: MEALS_PER_CYCLE[seed.cycle] * (seed.slot === "both" ? 2 : 1),
    monthlyValue: seed.monthlyValue,
    skippedDates: (seed.skipInDays ?? []).map((offset) => shiftDate(TODAY, offset)),
    addressLabel: seed.addressLabel,
    pausedUntil:
      seed.status === "paused" ? shiftDate(TODAY, seed.pausedForDays ?? 7) : undefined,
  };
});

export const subscriptionById = new Map(adminSubscriptions.map((s) => [s.id, s]));

/* ========================================================================== */
/*  Time series & aggregates                                                  */
/* ========================================================================== */

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
  subscriptionRevenue: number;
}

/**
 * 30 days of revenue ending TODAY. The shape is hand-tuned rather than random:
 * weekends peak, Mondays dip, and there is a visible upward trend so the chart
 * tells a story an operator would recognise.
 */
const DAILY_ORDERS_30: number[] = [
  58, 46, 51, 55, 62, 84, 91, 54, 49, 57, 61, 68, 89, 96, 59, 53, 60, 66, 71, 94,
  103, 63, 58, 65, 72, 77, 99, 108, 68, 74,
];

export const revenueSeries: RevenuePoint[] = DAILY_ORDERS_30.map((orders, index) => {
  const date = shiftDate(TODAY, index - (DAILY_ORDERS_30.length - 1));
  const avgTicket = 412 + seeded(`ticket-${date}`, 0, 96);
  const revenue = orders * avgTicket;
  return {
    date,
    orders,
    revenue,
    subscriptionRevenue: 2_400 + seeded(`sub-${date}`, 0, 1_800),
  };
});

/** Orders per hour of the kitchen's service day — drives the peak-hours chart. */
export const hourlyOrders: { hour: number; orders: number }[] = [
  { hour: 8, orders: 12 },
  { hour: 9, orders: 21 },
  { hour: 10, orders: 17 },
  { hour: 11, orders: 26 },
  { hour: 12, orders: 58 },
  { hour: 13, orders: 87 },
  { hour: 14, orders: 64 },
  { hour: 15, orders: 29 },
  { hour: 16, orders: 22 },
  { hour: 17, orders: 31 },
  { hour: 18, orders: 44 },
  { hour: 19, orders: 73 },
  { hour: 20, orders: 96 },
  { hour: 21, orders: 81 },
  { hour: 22, orders: 38 },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface HeatCell {
  day: Weekday;
  hour: number;
  orders: number;
}

/** Weekday × hour order counts. Derived deterministically from `hourlyOrders`. */
export const peakHoursHeatmap: HeatCell[] = WEEKDAYS.flatMap((day, dayIndex) => {
  // Weekends run ~35% hotter; midweek dips slightly.
  const dayWeight = [0.86, 0.92, 0.97, 1.0, 1.12, 1.35, 1.28][dayIndex];
  return hourlyOrders.map(({ hour, orders }) => ({
    day,
    hour,
    orders: Math.round((orders / 7) * dayWeight) + seeded(`${day}-${hour}`, 0, 3),
  }));
});

export interface CategoryPerformance {
  category: CategorySlug;
  name: string;
  revenue: number;
  orders: number;
  /** Percentage change against the previous 30-day window. */
  change: number;
}

export const categoryPerformance: CategoryPerformance[] = [
  { category: "north-indian", name: "North Indian", revenue: 486_200, orders: 2_140, change: 12.4 },
  { category: "paratha", name: "Paratha & Roti", revenue: 214_800, orders: 3_310, change: 8.1 },
  { category: "rice", name: "Rice", revenue: 188_400, orders: 1_290, change: 6.7 },
  { category: "pasta", name: "Pasta", revenue: 162_900, orders: 1_040, change: -3.2 },
  { category: "snacks", name: "Snacks", revenue: 148_300, orders: 1_180, change: 15.9 },
  { category: "maggi", name: "Maggi", revenue: 121_600, orders: 1_620, change: 4.4 },
  { category: "beverages", name: "Beverages", revenue: 96_700, orders: 2_050, change: 9.8 },
  { category: "desserts", name: "Desserts", revenue: 84_100, orders: 990, change: 11.2 },
  { category: "sandwich", name: "Sandwich", revenue: 62_400, orders: 640, change: -1.6 },
  { category: "idli", name: "Idli", revenue: 54_800, orders: 780, change: 2.9 },
  { category: "burgers", name: "Burgers", revenue: 41_200, orders: 430, change: -5.4 },
];

export interface TopDish {
  itemId: string;
  name: string;
  category: CategorySlug;
  imageId: string;
  unitsSold: number;
  revenue: number;
  change: number;
}

const TOP_DISH_SEEDS: [string, number, number][] = [
  ["nin-06", 428, 11.6],
  ["mag-05", 391, 6.2],
  ["nin-05", 337, 9.4],
  ["par-04", 318, -2.1],
  ["pas-02", 296, 4.8],
  ["snk-06", 271, 18.3],
  ["ric-02", 244, 3.5],
  ["idl-02", 218, 7.9],
];

export const topDishes: TopDish[] = TOP_DISH_SEEDS.map(([itemId, unitsSold, change]) => {
  const item = itemById.get(itemId);
  return {
    itemId,
    name: item?.name ?? "Kitchen special",
    category: item?.category ?? "north-indian",
    imageId: item?.imageId ?? "hero-1",
    unitsSold,
    revenue: unitsSold * (item?.price ?? 0),
    change,
  };
});

export interface StockAlert {
  itemId: string;
  name: string;
  level: "sold-out" | "low";
  /** Portions left in the kitchen right now. */
  portionsLeft: number;
  note: string;
}

export const stockAlerts: StockAlert[] = [
  { itemId: "nin-06", name: "Paneer Butter Masala", level: "low", portionsLeft: 6, note: "Paneer batch running out — next delivery 4 PM" },
  { itemId: "des-02", name: "Rasmalai", level: "sold-out", portionsLeft: 0, note: "Sold out since 1:10 PM" },
  { itemId: "snk-02", name: "Cheese Fries", level: "low", portionsLeft: 9, note: "Cheese slices below par level" },
  { itemId: "bev-06", name: "Chocolate Shake", level: "low", portionsLeft: 4, note: "Only 2 L milk left for shakes" },
  { itemId: "par-05", name: "Paneer Paratha", level: "sold-out", portionsLeft: 0, note: "Marked unavailable by kitchen lead" },
];

export interface SubscriberGrowthPoint {
  month: string;
  active: number;
  newSignups: number;
  churned: number;
}

export const subscriberGrowth: SubscriberGrowthPoint[] = [
  { month: "Aug 25", active: 612, newSignups: 74, churned: 21 },
  { month: "Sep 25", active: 668, newSignups: 81, churned: 25 },
  { month: "Oct 25", active: 731, newSignups: 92, churned: 29 },
  { month: "Nov 25", active: 795, newSignups: 96, churned: 32 },
  { month: "Dec 25", active: 842, newSignups: 88, churned: 41 },
  { month: "Jan 26", active: 918, newSignups: 114, churned: 38 },
  { month: "Feb 26", active: 977, newSignups: 101, churned: 42 },
  { month: "Mar 26", active: 1_046, newSignups: 112, churned: 43 },
  { month: "Apr 26", active: 1_098, newSignups: 97, churned: 45 },
  { month: "May 26", active: 1_154, newSignups: 104, churned: 48 },
  { month: "Jun 26", active: 1_211, newSignups: 109, churned: 52 },
  { month: "Jul 26", active: 1_268, newSignups: 113, churned: 56 },
];

export interface RetentionRow {
  cohort: string;
  size: number;
  /** Share of the cohort still ordering in month 0…5, as percentages. */
  months: number[];
}

export const retentionCohorts: RetentionRow[] = [
  { cohort: "Feb 26", size: 214, months: [100, 68, 54, 47, 43, 41] },
  { cohort: "Mar 26", size: 238, months: [100, 71, 58, 51, 46] },
  { cohort: "Apr 26", size: 196, months: [100, 66, 52, 45] },
  { cohort: "May 26", size: 251, months: [100, 74, 61] },
  { cohort: "Jun 26", size: 267, months: [100, 77] },
  { cohort: "Jul 26", size: 189, months: [100] },
];

/* ========================================================================== */
/*  Gallery media library                                                     */
/* ========================================================================== */

export interface MediaAsset {
  id: string;
  imageId: string;
  caption: string;
  category: "dishes" | "kitchen" | "team" | "packaging" | "moments";
  aspect: "portrait" | "landscape" | "square";
  uploadedAt: string;
  /** Bytes — displayed as KB/MB in the media card. */
  sizeBytes: number;
  /** Cloudinary public id the upload widget will write to. */
  publicId: string;
  featured?: boolean;
}

const MEDIA_SEEDS: [string, string, MediaAsset["category"], MediaAsset["aspect"], number][] = [
  ["hero-1", "Overhead spread of the full homestyle thali", "dishes", "portrait", 2],
  ["north-indian-2", "Paneer tikka straight off the tawa", "dishes", "landscape", 3],
  ["ambience-1", "Morning prep in the main kitchen", "kitchen", "landscape", 5],
  ["dessert-2", "Rasmalai plated for the weekend menu", "dishes", "square", 6],
  ["ingredients-1", "Whole spices weighed out for the day", "kitchen", "portrait", 8],
  ["north-indian-1", "Slow-cooked sabzi finished with coriander", "dishes", "portrait", 9],
  ["beverage-1", "Cold coffee poured over ice", "dishes", "portrait", 11],
  ["snacks-1", "Hot samosas resting after the fry", "dishes", "landscape", 12],
  ["ambience-2", "Evening dispatch counter", "moments", "landscape", 14],
  ["idli-1", "Idli steamers opened at 7 AM", "kitchen", "square", 16],
  ["salad-1", "Salad box packed for a Premium tiffin", "packaging", "portrait", 18],
  ["dessert-3", "Gulab jamun in warm syrup", "dishes", "square", 21],
  ["north-indian-3", "Dal makhani after an eight-hour simmer", "dishes", "landscape", 23],
  ["beverage-3", "Masala chai strained to order", "dishes", "portrait", 25],
  ["pasta-3", "White sauce pasta finished with herbs", "dishes", "landscape", 27],
  ["snacks-2", "Momos steamed in bamboo baskets", "dishes", "square", 29],
  ["dessert-4", "Brownie squares cut for dispatch", "dishes", "portrait", 32],
  ["north-indian-4", "Chef plating the Sunday special", "team", "landscape", 34],
  ["beverage-4", "Sweet lassi in kulhads", "dishes", "portrait", 36],
  ["dessert-5", "Ice cream scooped for a kids' order", "dishes", "square", 39],
  ["beverage-5", "Fresh lime soda on the pass", "dishes", "portrait", 42],
  ["hero-2", "Paneer butter masala in a copper kadai", "dishes", "portrait", 45],
];

export const mediaAssets: MediaAsset[] = MEDIA_SEEDS.map(
  ([imageId, caption, category, aspect, daysAgo], index) => ({
    id: `MED-${3000 + index}`,
    imageId,
    caption,
    category,
    aspect,
    uploadedAt: shiftDate(TODAY, -daysAgo),
    sizeBytes: 180_000 + seeded(`${imageId}-size`, 0, 1_400_000),
    publicId: `secret-kitchen/gallery/${imageId}`,
    featured: index < 4,
  }),
);

/* ========================================================================== */
/*  Today's Special                                                           */
/* ========================================================================== */

export interface SpecialSlot {
  itemId: string;
  /** Display order on the storefront rail. */
  position: number;
  /** Optional promotional price for today only. */
  specialPrice?: number;
  /** Short line printed on the storefront card. */
  blurb: string;
  scheduledFor: string;
}

export const todaysSpecials: SpecialSlot[] = [
  { itemId: "nin-06", position: 1, specialPrice: 199, blurb: "Chef's pick — slow-simmered gravy, extra makhan", scheduledFor: TODAY },
  { itemId: "par-05", position: 2, blurb: "Hand-rolled with fresh malai paneer", scheduledFor: TODAY },
  { itemId: "ric-03", position: 3, specialPrice: 149, blurb: "Long-grain basmati, paneer cubes tossed in ghee", scheduledFor: TODAY },
  { itemId: "des-02", position: 4, blurb: "Set overnight, served chilled", scheduledFor: TODAY },
];

/* ========================================================================== */
/*  Derived dashboard figures                                                 */
/* ========================================================================== */

const todaysOrders = adminOrders.filter((order) => order.placedAt.startsWith(TODAY));
const yesterday = shiftDate(TODAY, -1);
const yesterdaysOrders = adminOrders.filter((order) => order.placedAt.startsWith(yesterday));

function revenueOf(orders: AdminOrder[]): number {
  return orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  /** Percentage change against the equivalent previous period. */
  change: number;
  format: "currency" | "number";
  hint: string;
}

const activeSubscribers = adminSubscriptions.filter((s) => s.status === "active").length;
const todaysRevenue = revenueOf(todaysOrders);
const billableToday = todaysOrders.filter((o) => o.status !== "cancelled").length;

export const dashboardKpis: DashboardKpi[] = [
  {
    id: "revenue",
    label: "Today's revenue",
    value: todaysRevenue,
    change: percentChange(todaysRevenue, revenueOf(yesterdaysOrders)),
    format: "currency",
    hint: "Net of cancellations, inclusive of GST",
  },
  {
    id: "orders",
    label: "Orders today",
    value: todaysOrders.length,
    change: percentChange(todaysOrders.length, yesterdaysOrders.length),
    format: "number",
    hint: `${todaysOrders.filter((o) => o.status === "cancelled").length} cancelled`,
  },
  {
    id: "subscribers",
    label: "Active subscribers",
    value: activeSubscribers,
    change: 6.4,
    format: "number",
    hint: `${adminSubscriptions.filter((s) => s.status === "paused").length} paused this week`,
  },
  {
    id: "aov",
    label: "Average order value",
    value: billableToday ? Math.round(todaysRevenue / billableToday) : 0,
    change: 3.8,
    format: "currency",
    hint: "Across all channels",
  },
];

export const ordersByStatus: { status: OrderStatus; count: number }[] = (
  [
    "pending",
    "confirmed",
    "preparing",
    "out-for-delivery",
    "delivered",
    "cancelled",
  ] as OrderStatus[]
).map((status) => ({
  status,
  count: todaysOrders.filter((order) => order.status === status).length,
}));

/** The live feed on the dashboard — newest first, capped for readability. */
export const liveOrderFeed: AdminOrder[] = [...adminOrders]
  .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  .slice(0, 8);

/** Menu items currently switched off in the kitchen. */
export const unavailableItems = menuItems.filter((item) => !item.available);

/* ========================================================================== */
/*  Notifications                                                             */
/* ========================================================================== */

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  kind: "order" | "stock" | "subscription" | "review";
  unread: boolean;
}

export const adminNotifications: AdminNotification[] = [
  { id: "NTF-01", title: "New order TSK-24501", body: "Aarav Sharma · ₹1,024 · Sector 76", at: at(TODAY, "13:42"), kind: "order", unread: true },
  { id: "NTF-02", title: "Rasmalai sold out", body: "Marked unavailable automatically at 1:10 PM", at: at(TODAY, "13:10"), kind: "stock", unread: true },
  { id: "NTF-03", title: "Subscription renewing", body: "SUB-2014 renews tomorrow — 1 meal left", at: at(TODAY, "11:05"), kind: "subscription", unread: true },
  { id: "NTF-04", title: "New 5★ review", body: "\"Dal makhani tasted exactly like home.\" — Sneha K.", at: at(TODAY, "10:22"), kind: "review", unread: false },
  { id: "NTF-05", title: "Pause request", body: "SUB-2011 paused for 4 days by the customer", at: at(shiftDate(TODAY, -1), "18:47"), kind: "subscription", unread: false },
];

export const unreadNotificationCount = adminNotifications.filter((n) => n.unread).length;

/** The signed-in operator. Replaced by the session user once auth lands. */
export const adminUser = {
  name: "Ritika Malhotra",
  role: "Kitchen Manager",
  email: "ritika@thesecretkitchen.in",
  initials: "RM",
} as const;
