import type { Order, OrderItem, OrderStatusEvent } from "@prisma/client";

/** An order with everything needed to render a docket, a bill or a timeline. */
export type OrderWithItems = Order & { items: OrderItem[] };

export type OrderWithTimeline = OrderWithItems & { events: OrderStatusEvent[] };
