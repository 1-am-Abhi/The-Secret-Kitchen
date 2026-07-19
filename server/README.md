# The Secret Kitchen — API

Backend for **The Secret Kitchen**, a pure-veg cloud kitchen and monthly tiffin
service. Serves the storefront in `../web` and the admin panel.

**Stack:** Node 22 · Express 4 · TypeScript (strict) · Prisma · PostgreSQL ·
Zod · JWT · bcrypt · Cloudinary.

---

## Quick start

```bash
cd server
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                   # http://localhost:4000/api/health
```

`JWT_SECRET` must be at least 32 characters — generate one with
`openssl rand -hex 32`. The app validates the whole environment at boot and
exits with a readable report if anything is missing.

### Local Postgres in one line

```bash
docker run --name tsk-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=secret_kitchen -p 5432:5432 -d postgres:16-alpine
```

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | tsx watch, reloads on save |
| `npm run build` | `prisma generate` + `tsc` → `dist/` |
| `npm start` | Runs the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src/` and `prisma/` |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | `prisma migrate dev` (local only) |
| `npm run prisma:deploy` | `prisma migrate deploy` (deployed environments) |
| `npm run prisma:studio` | Prisma Studio data browser |
| `npm run seed` | Idempotent seed (catalogue + demo data + admin) |

---

## Migrations

```bash
# Local: creates a migration file and applies it
npx prisma migrate dev --name add_something

# Deployed: applies committed migrations, never prompts
npx prisma migrate deploy
```

Commit everything under `prisma/migrations/`. Deployments run
`migrate deploy`; `migrate dev` must never touch a shared database because it
can reset it.

---

## Seeding

`npm run seed` ports the full storefront catalogue into Postgres:

- 11 categories, 58 dishes with prices, nutrition, tags and add-ons
- 3 tiffin plans, 6 offers, 12 reviews, 22 FAQs, 18 gallery rows
- an admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- demo customers, orders and subscriptions so the dashboard has real numbers

Every write is an `upsert` keyed on a stable business key, so re-running
refreshes content rather than duplicating it. Demo transactional rows use the
reserved `TSK-DEMO-` / `SUB-DEMO-` prefixes and are replaced wholesale each run.
The admin password is **reset on every seed** — that is the supported way to
recover a lost credential.

---

## API surface

All routes are mounted under `/api`. Errors always return
`{ message, code?, details? }`.

### Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Pings Postgres; 503 when the DB is down |
| GET | `/api/menu` | Filter by `category`, `search`, `tags`, `spiceLevel`, `minPrice`, `maxPrice`, `isJain`, `sort`; `grouped=true` returns category rails |
| GET | `/api/menu/categories` | Categories with item counts and starting prices |
| GET | `/api/menu/:slug` | One dish plus related dishes |
| GET | `/api/specials/today` | Curated specials, falling back to the day-of-year rotation |
| GET | `/api/plans` | Tiffin plans with monthly savings |
| GET | `/api/offers` | Live coupons |
| POST | `/api/offers/validate` | `{ code, subtotal, context }` → `{ ok, discount, message }` |
| POST | `/api/orders` | Places an order; prices and coupon are recomputed server-side |
| GET | `/api/orders/:orderNumber` | Guest order tracking |
| POST | `/api/orders/:orderNumber/cancel` | Guest cancellation, verified by phone |
| POST | `/api/subscriptions` | Starts a tiffin plan |
| GET | `/api/subscriptions/:id` | By id or `SUB-…` code |
| PATCH | `/api/subscriptions/:id/pause` | Meals roll over, never expire |
| PATCH | `/api/subscriptions/:id/resume` | Restarts from the next dispatch day |
| PATCH | `/api/subscriptions/:id/skip` | Skip one date; credited back to the plan |
| PATCH | `/api/subscriptions/:id/cancel` | Returns a pro-rata refund estimate |
| POST | `/api/customers/lookup` | Guest "my orders" by phone |
| GET | `/api/reviews` | Published reviews + rating summary |
| POST | `/api/reviews` | Submitted unpublished, pending approval |
| GET | `/api/gallery` | Filter by `category` |
| POST | `/api/newsletter` | Idempotent subscribe |
| POST | `/api/newsletter/unsubscribe` | |
| POST | `/api/enquiries` | Contact form, honeypot-protected |
| GET | `/api/faqs` | Optional `?category=` |
| GET | `/api/config` | Delivery fee, thresholds, GST rate |

### Admin — `Authorization: Bearer <token>`

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | → `{ token, admin }` |
| GET | `/api/auth/me` | Current admin |
| POST | `/api/auth/change-password` | |
| POST/PATCH/DELETE | `/api/menu/items[/:id]` | Dishes with past orders are retired, not deleted |
| POST/PATCH/DELETE | `/api/menu/categories[/:id]` | Refuses to delete a non-empty category |
| GET/POST/PATCH/DELETE | `/api/specials[/:id]` | Daily special planner |
| POST/PATCH | `/api/plans[/:id]` | Tiffin plan management |
| POST/PATCH/DELETE | `/api/offers[/:id]` | Redeemed coupons are deactivated, not deleted |
| GET | `/api/orders/admin` | Filter by `status`, `paymentStatus`, `search`, `from`, `to` |
| GET | `/api/orders/admin/:id` | Order with customer |
| PATCH | `/api/orders/admin/:id` | Status transitions are validated; timestamps are derived |
| GET | `/api/subscriptions/admin` | |
| GET | `/api/customers`, `/api/customers/:id` | With lifetime value |
| GET | `/api/newsletter/subscribers` | |
| GET/PATCH | `/api/enquiries[/:id]` | |
| PATCH/DELETE | `/api/reviews/:id` | Approve / remove |
| POST/PATCH/DELETE | `/api/gallery[/:id]` | |
| POST | `/api/gallery/upload` | `multipart/form-data`, field `image` (≤5 MB) → Cloudinary |
| GET | `/api/analytics/dashboard` | `?days=30&topDishes=8` |

---

## Money and pricing

`src/utils/pricing.ts` is the authoritative bill calculation and mirrors
`web/src/store/cart-store.ts::selectTotals` exactly. Order of operations:

1. discount comes off the subtotal;
2. delivery (₹29, free above ₹349) is assessed against the **original**
   subtotal, so a coupon can never re-add a fee the cart had already earned away;
3. GST (5%) applies to the discounted food value plus the ₹15 packaging fee, but
   not to delivery.

`FREEDEL` waives the delivery fee instead of discounting food, so its ₹29 value
must never also come off the subtotal. Minimum order is ₹99. All money is stored
as whole-rupee `Int` columns, matching the storefront.

The client is never trusted with money: `POST /api/orders` re-reads every price
from the catalogue, re-evaluates the coupon, and rejects a coupon that has since
become invalid rather than silently charging more.

---

## Deploying

### Render

`render.yaml` is a ready blueprint (web service + Postgres). Render dashboard →
**New → Blueprint** → pick this repo. Then set the `sync: false` secrets:
`CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and the Cloudinary trio.
`JWT_SECRET` is generated for you. Health checks hit `/api/health`.

### Railway

Railway has no blueprint file — configure the service once in the dashboard:

1. **New Project → Deploy from GitHub**, then set **Root Directory** to `server`.
2. Add the **PostgreSQL** plugin; it injects `DATABASE_URL` automatically.
3. Build command:
   `npm ci && npx prisma generate && npm run build && npx prisma migrate deploy`
4. Start command: `npm run start`
5. Add the remaining variables from `.env.example`. Railway injects `PORT` — the
   app reads it, so leave it unset.
6. Optional: run `npm run seed` once from the Railway shell to load the catalogue.

Railway can also build the `Dockerfile` instead; set the builder to Dockerfile
and it will use the multi-stage image below.

### Docker

```bash
docker build -t secret-kitchen-api ./server
docker run --rm -p 4000:4000 --env-file server/.env secret-kitchen-api
```

Multi-stage on `node:22-alpine`, runs as the unprivileged `node` user, and uses
`dumb-init` so SIGTERM reaches Node and the graceful drain in `src/index.ts`
actually runs.

---

## Layout

```
src/
  index.ts              process bootstrap, graceful shutdown
  app.ts                express wiring (helmet, cors, compression, limits)
  config/               env (Zod, fail-fast), prisma singleton, cloudinary, commerce rules
  middleware/           errorHandler, notFound, auth, validate, rateLimit, requestLogger
  utils/                AppError, asyncHandler, pricing, dates, orderNumber, pagination, mappers, logger
  modules/              menu, specials, orders, subscriptions, customers, offers,
                        gallery, reviews, newsletter, enquiries, auth, analytics, content
  routes/index.ts       mounts everything under /api
  data/                 build-your-tiffin component catalogue (server-priced)
  seed/                 seed implementation + ported storefront content
prisma/
  schema.prisma         models, enums, indexes
  seed.ts               entrypoint → src/seed
```

---

## Security notes

- helmet, CORS allow-list from `CORS_ORIGIN`, compression, 256 kb body cap.
- Per-route rate limits on every public write path; login limited to 8 attempts
  per 15 minutes, coupon validation to 20 per 5 minutes.
- bcrypt (12 rounds); login runs a hash comparison even for unknown emails so
  timing cannot be used to enumerate accounts.
- Admin JWTs are re-checked against the database on every request, so
  deactivating an account takes effect immediately.
- Stack traces are returned in development only.
- `trust proxy` is set for Render/Railway so rate limiting sees real client IPs.
