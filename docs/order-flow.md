# Order flow — architecture contract

This document is the single agreed contract between the storefront, the admin
panel and the API. Change it here first, then change the code.

## The core rule

> **The database is the only source of truth for whether an order exists.**
> WhatsApp is a *notification channel*, never a system of record.

An order row is committed **before** WhatsApp is opened. If the customer never
presses Send, the order still exists — it simply sits in
`PENDING_CUSTOMER_CONFIRMATION` until the kitchen confirms or expires it.

This is why `POST /api/orders` must never be optimistic and must never be faked
client-side: a "success" the database did not witness is a lost order.

---

## Lifecycle

```
                    ┌──────────────────────────────┐
  customer submits  │ PENDING_CUSTOMER_CONFIRMATION│  ← row committed, then
  checkout ────────▶│  (order exists, unconfirmed) │    WhatsApp opens
                    └──────────────┬───────────────┘
                                   │ kitchen receives the WhatsApp message
                                   ▼
    CONFIRMED ▶ PREPARING ▶ COOKING ▶ PACKED ▶ OUT_FOR_DELIVERY ▶ DELIVERED
                                   │
                                   └──▶ CANCELLED (from any non-terminal state)
```

`DELIVERED` and `CANCELLED` are terminal. Backward transitions are rejected —
revenue reporting counts `DELIVERED` rows and must not be rewritable.

### Status meanings

| Status                          | Meaning                                              |
| ------------------------------- | ---------------------------------------------------- |
| `PENDING_CUSTOMER_CONFIRMATION` | Saved in the DB; awaiting the customer's WhatsApp Send |
| `CONFIRMED`                     | Kitchen has acknowledged the order                    |
| `PREPARING`                     | Ingredients prepped, order queued to the pass         |
| `COOKING`                       | Actively on the fire                                  |
| `PACKED`                        | Sealed and waiting for a rider                        |
| `OUT_FOR_DELIVERY`              | With the rider                                        |
| `DELIVERED`                     | Handed over                                           |
| `CANCELLED`                     | Cancelled by customer or kitchen                      |

---

## Channel abstraction (future Razorpay)

`Order.channel` records **how the order was placed**, and each channel supplies
an `OrderChannelHandler` that decides the initial status, the initial payment
status, and the post-create handoff.

```ts
interface OrderChannelHandler {
  readonly channel: OrderChannel;
  initialStatus(): OrderStatus;
  initialPaymentStatus(): PaymentStatus;
  /** Extra fields returned to the client to complete the handoff. */
  handoff(order: OrderWithItems): Promise<ChannelHandoff>;
}
```

| Channel    | Initial status                  | Initial payment | Handoff payload         |
| ---------- | ------------------------------- | --------------- | ----------------------- |
| `WHATSAPP` | `PENDING_CUSTOMER_CONFIRMATION` | `PENDING`       | `{ whatsappUrl, text }` |
| `RAZORPAY` | `PENDING_PAYMENT`               | `PENDING`       | `{ checkoutSession }`   |
| `COD`      | `CONFIRMED`                     | `PENDING`       | `{}`                    |

**Adding Razorpay later must not touch the order model, the admin panel or the
tracking page** — it registers one new handler. That is the whole point of this
indirection.

---

## Order numbers

Format: `TSK-YYYY-NNNNN` — e.g. `TSK-2026-00041`.

Sequential and gapless per calendar year, allocated from an `OrderCounter` row
inside the same transaction as the order insert, using a locking update so two
concurrent checkouts cannot receive the same number.

Sequential (not random) because the kitchen reads these aloud over WhatsApp and
counts them by hand at end of service.

---

## API

### `POST /api/orders` — create

Request:

```jsonc
{
  "channel": "WHATSAPP",
  "customer": { "name": "Rahul Sharma", "phone": "9876543210", "whatsappPhone": "9876543211" },
  "address": { "line1": "B-402, Sunrise Residency", "landmark": "Opp. Fortis",
               "city": "Noida", "pincode": "201309" },
  "items": [{ "itemId": "cheese-maggi", "quantity": 2, "addOnIds": [], "note": null }],
  "couponCode": "SECRET50",
  "kitchenNote": "Less spicy please"
}
```

`201` response:

```jsonc
{
  "data": {
    "orderNumber": "TSK-2026-00041",
    "status": "PENDING_CUSTOMER_CONFIRMATION",
    "bill": { "subtotal": 430, "total": 474, "currency": "INR", "...": "..." },
    "items": [ /* snapshotted lines */ ],
    "delivery": { "...": "..." },
    "placedAt": "2026-07-19T12:04:11.000Z",
    "handoff": {
      "channel": "WHATSAPP",
      "whatsappUrl": "https://wa.me/919876543210?text=...",
      "text": "Hello The Secret Kitchen, ..."
    }
  }
}
```

Prices are **always** recomputed server-side from the catalogue. The client
tells us *what* it wants, never what it costs.

### `GET /api/orders/track/:orderNumber` — public tracking

Returns the order plus its status timeline. The order number is the only
credential; it carries no personal data beyond what the customer already
submitted, and the format is not guessable at volume.

```jsonc
{
  "data": {
    "orderNumber": "TSK-2026-00041",
    "status": "COOKING",
    "timeline": [
      { "status": "PENDING_CUSTOMER_CONFIRMATION", "at": "...", "note": null },
      { "status": "CONFIRMED", "at": "...", "note": null },
      { "status": "PREPARING", "at": "...", "note": null },
      { "status": "COOKING", "at": "...", "note": null }
    ],
    "estimatedMinutes": 28
  }
}
```

### `POST /api/orders/:orderNumber/handoff-opened`

Fire-and-forget telemetry recording that the WhatsApp deep link was opened.
Sets `whatsappOpenedAt`. **Never** changes the order status — pressing Send is
not something the browser can observe, so we must not pretend otherwise.

### Admin

| Method  | Path                              | Purpose                              |
| ------- | --------------------------------- | ------------------------------------ |
| `GET`   | `/api/admin/orders`               | Filter, search, paginate             |
| `GET`   | `/api/admin/orders/:id`           | Full detail with timeline            |
| `PATCH` | `/api/admin/orders/:id`           | Advance status, add notes            |
| `GET`   | `/api/admin/orders/stream`        | **SSE** live feed                    |

### SSE events on `/api/admin/orders/stream`

```
event: order.created
data: { "orderNumber": "TSK-2026-00041", "customerName": "Rahul", "total": 474, "itemCount": 3, "placedAt": "..." }

event: order.status_changed
data: { "orderNumber": "TSK-2026-00041", "from": "CONFIRMED", "to": "COOKING" }

event: ping
data: {}
```

A `ping` every 25s keeps proxies from closing the connection. The admin client
reconnects with backoff and falls back to polling if SSE is unavailable.

---

## Status timeline

Every transition appends an `OrderStatusEvent` row rather than only stamping a
column. The tracking page and the admin detail view both render from this table,
so customer-facing progress and the internal audit trail can never disagree.

---

## Failure handling

| Situation                          | Behaviour                                                        |
| ---------------------------------- | ---------------------------------------------------------------- |
| API unreachable at checkout        | Show an error and keep the cart. **Never** claim the order exists |
| Coupon expired between load & pay  | `422 COUPON_REJECTED` — customer re-confirms the new total        |
| Dish went unavailable              | `409` naming the dish                                             |
| Below minimum order                | `422 BELOW_MINIMUM_ORDER`                                         |
| WhatsApp popup blocked             | Confirmation page always shows a manual Send button               |
| Customer never presses Send        | Order stays `PENDING_CUSTOMER_CONFIRMATION`; admin sees and calls |
