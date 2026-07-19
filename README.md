# The Secret Kitchen

> Homemade Happiness, Delivered Fresh.

A production-ready cloud kitchen and monthly tiffin service platform — pure-veg
menu ordering, subscription meal plans, an interactive tiffin builder and a full
admin panel.

## Repository layout

```
.
├── web/      Next.js 15 storefront + admin panel  → deploys to Vercel
└── server/   Express + Prisma API                 → deploys to Railway / Render
```

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Framework | Next.js 15 (App Router), React 19, TypeScript                 |
| Styling   | Tailwind CSS v4, shadcn/ui primitives, Framer Motion, Lucide   |
| Forms     | React Hook Form + Zod                                          |
| Backend   | Node.js, Express, Prisma ORM, PostgreSQL                       |
| Media     | Cloudinary                                                     |

## Getting started

```bash
# Frontend
cd web
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Full setup, environment variables and deployment instructions are documented
further down as each part of the system lands.

## Design system

All brand tokens — colour ramps, typography, radii, shadows, motion easings —
live in a single `@theme` block in `web/src/app/globals.css`. Editing that block
re-skins the entire product.

| Token       | Value     | Usage                       |
| ----------- | --------- | --------------------------- |
| `brand-500` | `#FF6B00` | Primary actions, highlights |
| `ink-800`   | `#1F2937` | Headings, dark surfaces     |
| `fresh-500` | `#22C55E` | Veg badges, success states  |
| `surface`   | `#FFFFFF` | Page background             |
| `ink-50`    | `#F8F9FA` | Muted sections              |

Typography pairs **Playfair Display** (headings) with **Poppins** (body).
