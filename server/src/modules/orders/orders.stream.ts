import type { Request, Response } from "express";

import { prisma } from "../../config/prisma";
import { orderEvents, type OrderEvent } from "./orders.events";

/**
 * Server-Sent Events feed of order activity, for the admin panel.
 *
 * SSE rather than WebSockets: the traffic is strictly one-way (server → admin),
 * it reconnects automatically in every browser, and it rides plain HTTP so no
 * proxy or platform configuration is needed. A WebSocket would be more
 * machinery for no benefit here.
 */

const PING_INTERVAL_MS = 25_000;

function send(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function streamOrders(req: Request, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Nginx buffers proxied responses by default, which would hold events until
    // the buffer filled and defeat the entire point of a live stream.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  // Tell the client how long to wait before reconnecting after a drop.
  res.write("retry: 5000\n\n");

  send(res, "connected", { at: new Date().toISOString() });

  // Replay anything created in the last two minutes so an admin who reconnects
  // mid-service is not silently missing an order. The client dedupes by order
  // number, so a replayed event never double-notifies.
  void prisma.order
    .findMany({
      where: { createdAt: { gte: new Date(Date.now() - 2 * 60_000) } },
      orderBy: { createdAt: "asc" },
      select: {
        orderNumber: true,
        deliveryName: true,
        deliveryPhone: true,
        total: true,
        channel: true,
        status: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    })
    .then((recent) => {
      if (res.writableEnded) return;
      for (const order of recent) {
        send(res, "order.created", {
          orderNumber: order.orderNumber,
          customerName: order.deliveryName,
          customerPhone: order.deliveryPhone,
          total: order.total,
          itemCount: order._count.items,
          channel: order.channel,
          status: order.status,
          placedAt: order.createdAt.toISOString(),
          replay: true,
        });
      }
    })
    .catch(() => {
      // A failed replay must not kill a live stream that is otherwise fine.
    });

  const unsubscribe = orderEvents.subscribe((event: OrderEvent) => {
    if (res.writableEnded) return;
    send(res, event.type, event.data);
  });

  // Idle connections are reaped by proxies and load balancers; a periodic
  // comment-free ping keeps the socket demonstrably alive.
  const ping = setInterval(() => {
    if (res.writableEnded) return;
    send(res, "ping", { at: new Date().toISOString() });
  }, PING_INTERVAL_MS);

  const cleanup = () => {
    clearInterval(ping);
    unsubscribe();
    if (!res.writableEnded) res.end();
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
}
