# The Secret Kitchen

> Homemade Happiness, Delivered Fresh.

A production-ready platform for a pure-vegetarian cloud kitchen and monthly
tiffin service: menu ordering, subscription meal plans, an interactive tiffin
builder, and a full operational admin panel.

```
.
├── web/      Next.js 15 storefront + admin panel  → deploys to Vercel
└── server/   Express + Prisma API                 → deploys to Railway / Render
```

---

## Tech stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 15 (App Router), React 19, TypeScript (strict)        |
| Styling    | Tailwind CSS v4, shadcn/ui primitives on Radix                |
| Motion     | Framer Motion (reduce-motion aware throughout)                |
| Icons      | Lucide                                                        |
| Forms      | React Hook Form + Zod                                         |
| State      | Zustand (persisted cart)                                      |
| Backend    | Node.js, Express, TypeScript                                  |
| Database   | PostgreSQL via Prisma ORM                                     |
| Media      | Cloudinary                                                    |

---

## Quick start

### Frontend

```bash
cd web
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000
```

The storefront runs entirely standalone — the menu catalogue is bundled, so you
do not need the API or a database to develop or demo the UI.

### Backend

```bash
cd server
cp .env.example .env     # set DATABASE_URL and JWT_SECRET at minimum
npm install
npx prisma migrate dev   # create the schema
npm run seed             # load the real menu, plans, offers and demo orders
npm run dev              # http://localhost:4000
```

Then set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `web/.env.local` to
connect the two.

### Useful scripts

| Command                | Where    | Purpose                          |
| ---------------------- | -------- | -------------------------------- |
| `npm run dev`          | both     | Development server               |
| `npm run build`        | both     | Production build                 |
| `npm run typecheck`    | both     | TypeScript, no emit              |
| `npm run lint`         | both     | ESLint                           |
| `npm run check`        | web      | Typecheck + lint in one pass     |
| `npm run seed`         | server   | Seed the database                |
| `npm run prisma:studio`| server   | Browse the database              |

---

## Architecture

### Route groups

```
web/src/app/
├── (site)/          Storefront — navbar, footer, floating dock, cart drawer
│   ├── page.tsx     Home
│   ├── menu/        Menu with search + filters
│   ├── tiffin/      Plans, weekly menu, Build Your Tiffin, subscription demo
│   ├── about/  gallery/  offers/  contact/  faq/
│   ├── cart/   checkout/  checkout/success/
│   └── terms/  privacy/  refund-policy/
├── admin/           Operations panel — its own chrome, noindex
├── sitemap.ts  robots.ts  manifest.ts  icon.tsx  opengraph-image.tsx
└── not-found.tsx  error.tsx
```

### Where things live

| Concern            | Location                        |
| ------------------ | ------------------------------- |
| Brand tokens       | `web/src/app/globals.css`       |
| Business identity  | `web/src/config/site.ts`        |
| Photography        | `web/src/config/images.ts`      |
| Navigation         | `web/src/config/navigation.ts`  |
| Menu catalogue     | `web/src/data/menu.ts`          |
| Tiffin plans       | `web/src/data/tiffin.ts`        |
| Coupons            | `web/src/data/offers.ts`        |
| Cart + bill maths  | `web/src/store/cart-store.ts`   |
| Form schemas       | `web/src/lib/validation.ts`     |
| SEO helpers        | `web/src/lib/seo.ts`            |

### Design principles applied

- **One source of truth per concern.** The bill is calculated in exactly one
  function (`selectTotals`), so the cart drawer, cart page and checkout summary
  cannot disagree. Coupon rules live in one place (`applyCoupon`). Tiffin
  pricing and validation live in the data layer, not in the component.
- **Server components by default.** Only genuinely interactive leaves are client
  components, which keeps the JavaScript payload small.
- **Data layers stay JSX-free** so the same modules can be shared with the API
  and the seed script.

---

## Design system

Every brand token — colour ramps, typography, radii, shadows, motion easings —
lives in a single `@theme` block in `web/src/app/globals.css`. Editing that block
re-skins the entire product.

| Token       | Value     | Usage                       |
| ----------- | --------- | --------------------------- |
| `brand-500` | `#FF6B00` | Primary actions, highlights |
| `ink-800`   | `#1F2937` | Headings, dark surfaces     |
| `fresh-500` | `#22C55E` | Veg badges, success states  |
| `surface`   | `#FFFFFF` | Page background             |
| `ink-50`    | `#F8F9FA` | Muted sections              |

Typography pairs **Playfair Display** (headings) with **Poppins** (body), both
loaded through `next/font` with `display: swap`.

---

## Replacing the photography

This is designed to be a **one-file change**. Components never reference an image
URL — they reference a stable key (`"north-indian-1"`, `"hero-1"`) that resolves
through `web/src/config/images.ts`.

1. Shoot or generate the new images.
2. Upload them to Cloudinary.
3. In `web/src/config/images.ts`, change that key's `src` to the Cloudinary URL.
   The host is already allow-listed in `next.config.ts`.

Every card, hero and gallery tile picks it up automatically. Aspect ratios are
enforced by the layout rather than by the file, so **nothing reflows**.

Unknown keys degrade gracefully — first to a sibling in the same family, then to
a global fallback — so a missing photo never renders as a broken image.

> The seeded photography has each been visually inspected to confirm it contains
> no meat, fish or egg. Keep that check in place when swapping images: this is a
> pure-veg brand and a stray non-veg photo is a trust failure, not a typo.

---

## Configuration

All business details are environment-overridable, so one build can be re-pointed
at a different outlet without touching code. See `web/.env.example` and
`server/.env.example` for the complete list.

**Before going live, replace the placeholder contact details** — phone, WhatsApp,
email, address, coordinates and FSSAI licence number in `web/src/config/site.ts`
(or via environment variables).

---

## Deployment

### Frontend → Vercel

1. Import the repository and set the **root directory** to `web`.
2. Add environment variables from `web/.env.example`
   (`NEXT_PUBLIC_SITE_URL` must be the production origin — it drives canonical
   URLs, the sitemap and Open Graph tags).
3. Deploy. `vercel.json` pins the Mumbai region, HSTS and immutable static
   caching.

### Backend → Railway or Render

1. Set the **root directory** to `server`.
2. Provision a PostgreSQL instance and set `DATABASE_URL`.
3. Set `JWT_SECRET`, `CORS_ORIGIN` (your Vercel URL) and the Cloudinary keys.
4. Run migrations and seed on first deploy.

`server/render.yaml` and `server/Dockerfile` are included; see
`server/README.md` for the full runbook.

---

## Quality

- **Accessibility** — semantic landmarks, skip link, keyboard-operable dialogs
  and menus, `aria-live` on async results, visible focus rings, and a global
  `prefers-reduced-motion` override that neutralises every animation.
- **Performance** — AVIF/WebP with responsive `sizes`, blur placeholders, route
  code-splitting, barrel-import optimisation for icons, and static prerendering
  of every storefront page.
- **SEO** — per-page metadata, canonical URLs, Open Graph and Twitter cards, and
  JSON-LD for Restaurant, Organization, WebSite, Menu, Product, FAQPage and
  BreadcrumbList.
- **Security** — `nosniff`, `X-Frame-Options`, referrer policy and permissions
  policy headers; JWT-guarded admin API; Zod validation on every input.

---

## Licence

Proprietary — © The Secret Kitchen.
