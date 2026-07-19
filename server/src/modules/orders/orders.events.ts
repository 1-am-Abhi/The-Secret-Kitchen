import { EventEmitter } from "node:events";

/**
 * In-process order event bus, consumed by the admin SSE stream.
 *
 * Scope, stated plainly: this is per-process. With a single API instance — the
 * normal shape for a kitchen doing hundreds of orders a day — it is exactly
 * right and adds no infrastructure. If the API is ever scaled to multiple
 * instances, an admin connected to instance A would miss orders created on
 * instance B, and this emitter should be swapped for Redis pub/sub. That is a
 * one-file change: only `subscribe` and the two `emit*` helpers are public.
 */

export interface OrderCreatedEvent {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  itemCount: number;
  channel: string;
  status: string;
  placedAt: string;
}

export interface OrderStatusChangedEvent {
  orderNumber: string;
  customerName: string;
  from: string;
  to: string;
  at: string;
}

export type OrderEvent =
  | { type: "order.created"; data: OrderCreatedEvent }
  | { type: "order.status_changed"; data: OrderStatusChangedEvent };

type Listener = (event: OrderEvent) => void;

class OrderEventBus {
  // A busy service can have several admin tablets plus the owner's phone
  // connected at once; the default cap of 10 would log a spurious leak warning.
  private readonly emitter = new EventEmitter().setMaxListeners(50);

  private static readonly CHANNEL = "order";

  /** Returns an unsubscribe function — callers must call it on disconnect. */
  subscribe(listener: Listener): () => void {
    this.emitter.on(OrderEventBus.CHANNEL, listener);
    return () => {
      this.emitter.off(OrderEventBus.CHANNEL, listener);
    };
  }

  emitCreated(data: OrderCreatedEvent): void {
    this.emitter.emit(OrderEventBus.CHANNEL, { type: "order.created", data });
  }

  emitStatusChanged(data: OrderStatusChangedEvent): void {
    this.emitter.emit(OrderEventBus.CHANNEL, { type: "order.status_changed", data });
  }

  get listenerCount(): number {
    return this.emitter.listenerCount(OrderEventBus.CHANNEL);
  }
}

export const orderEvents = new OrderEventBus();
