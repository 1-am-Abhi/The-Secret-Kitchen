# Deploying the API to Railway

The backend lives entirely in `server/`. This document covers how it is
configured to deploy from a monorepo, and what to do on Railway.

The frontend in `web/` deploys separately to Vercel and is **not affected** by
anything here.

---

## The problem

```
/
├── server    ← the API
├── web       ← Next.js storefront (deploys to Vercel)
└── docs
```

There is no `package.json` at the repository root. Railway's automatic build
detection (Railpack) inspects the root, finds no Node project, and gives up:

```
No start command detected
```

It is not misconfigured — there genuinely is nothing runnable at the root.

---

## The solution: Dockerfile build, driven by `railway.toml`

Three files at the repository root:

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `railway.toml`   | Tells Railway to build the Dockerfile, and defines start/health/migrations |
| `Dockerfile`     | Multi-stage build that compiles and packages **only** `server/`           |
| `.dockerignore`  | Keeps `web/` (568 MB) out of the build context                            |

They must be at the **root**, not inside `server/`, because Railway uses the
repository root as the Docker build context — a Dockerfile inside `server/`
cannot `COPY` files that sit outside its own context.

### Why this over the alternatives

| Option                          | Verdict                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dockerfile + `railway.toml`** | **Chosen.** The entire deployment is described in git. New environments, PR environments and rebuilds are identical, with no dashboard state anyone has to remember. |
| Railway "Root Directory"        | Works, and is Railway's documented monorepo path — but it is a dashboard setting. It lives outside version control and has to be re-applied per environment. Documented below as a fallback. |
| Railpack / Nixpacks at root     | Cannot work. There is no root `package.json` for it to detect, which is the original error.                                                                          |

The build is also reproducible locally, which a builder-based deploy is not.

---

## One-time Railway setup

1. **Create the project** → *New Project* → *Deploy from GitHub repo* → select
   this repository.
2. **Add PostgreSQL** → *New* → *Database* → *PostgreSQL*. Railway exposes it as
   `${{Postgres.DATABASE_URL}}`.
3. **Set the environment variables** on the API service (table below).
4. Deploy. Railway reads `railway.toml`, builds the root `Dockerfile`, runs
   `prisma migrate deploy`, then starts the API.

No "Root Directory" setting is required — `railway.toml` already points the
build at the right place.

### Environment variables

Required:

| Variable         | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `DATABASE_URL`   | `${{Postgres.DATABASE_URL}}` (reference, do not paste a URL)  |
| `JWT_SECRET`     | 32+ chars — generate with `openssl rand -hex 32`              |
| `CORS_ORIGIN`    | The Vercel origin, e.g. `https://thesecretkitchen.in`         |
| `ADMIN_EMAIL`    | Admin login                                                   |
| `ADMIN_PASSWORD` | Admin login — change it from the default                      |

Recommended:

| Variable                                                          | Value                          |
| ----------------------------------------------------------------- | ------------------------------ |
| `BUSINESS_WHATSAPP`                                               | Kitchen WhatsApp, e.g. `919876543210` |
| `BUSINESS_NAME`                                                   | `The Secret Kitchen`           |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required only for gallery uploads |

`NODE_ENV=production` is baked into the image. `PORT` is injected by Railway and
read by `src/config/env.ts` — do not set it manually.

The full list, with defaults, is in `server/.env.example`. Boot fails fast and
loudly on a missing or invalid variable, by design.

### Point the frontend at the API

In **Vercel**, set `NEXT_PUBLIC_API_URL` to `https://<your-api>.up.railway.app/api`
(note the `/api` suffix). Then set `CORS_ORIGIN` on Railway to the Vercel origin.
These two must agree or the browser will block every request.

---

## Migrations

`railway.toml` runs them as a **pre-deploy** step:

```toml
preDeployCommand = "npx prisma migrate deploy"
```

This runs after the image is built but **before** traffic moves to the new
version. If a migration fails the release aborts and the previous deployment
keeps serving.

`migrate deploy` is the non-interactive form: it applies committed migrations
and never generates, resets or prompts. Never run `migrate dev` against a
deployed database.

### Seeding

Seeding is deliberately **not** automatic — it is destructive for demo rows.
Run it once, manually, after the first deploy:

```bash
railway run npm run seed --service <api-service-name>
```

---

## Only `server/` triggers a deploy

```toml
watchPatterns = ["server/**", "Dockerfile", ".dockerignore", "railway.toml"]
```

Without this, every frontend commit would rebuild and redeploy the API.

---

## Verification

The build and runtime were verified by replaying each Dockerfile stage locally
against a fresh, empty PostgreSQL instance:

- `npm ci` + `npm run build` from a root build context produces `dist/index.js`
- production-only install generates a working Prisma client (108 MB image tree)
- `prisma migrate deploy` creates all 21 tables on an empty database, using the
  CLI already inside the image — no network fetch mid-release
- `node dist/index.js` boots and `/api/health` returns `200 {"database":"up"}`
- `/api/menu`, `/api/plans` and `/api/offers` serve real data
- `SIGTERM` shuts the process down cleanly, so redeploys do not sever requests

> Not verified: the `docker build` itself, because no container runtime is
> installed on the machine this was authored on. The stage logic, COPY paths and
> commands were each executed directly; the image assembly was not. Watch the
> first Railway build log.

---

## Troubleshooting

| Symptom                                     | Cause and fix                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `No start command detected`                 | Railway is not reading `railway.toml`. Confirm it is at the repo root and the service points at this repo. |
| `COPY server/...: not found`                | The build context is not the repo root — check no "Root Directory" is set on the service.                |
| `@prisma/client did not initialize yet`     | The generate step did not run. Check the `deps` stage in the build log.                                  |
| Healthcheck fails, logs show `database: down` | `DATABASE_URL` is wrong or Postgres is not attached. Use the `${{Postgres.DATABASE_URL}}` reference.    |
| CORS errors in the browser                  | `CORS_ORIGIN` does not exactly match the Vercel origin (scheme and host, no trailing slash).             |
| Migration fails on deploy                   | Release aborts, previous version keeps serving. Fix the migration and redeploy — no partial state.        |

---

## Fallback: the "Root Directory" approach

If you would rather use Railway's dashboard-native monorepo support:

1. Service → *Settings* → *Root Directory* → `server`
2. Delete the root `railway.toml` and `Dockerfile`, or Railway will keep using them
3. Railway then builds `server/` in isolation and picks up `server/Dockerfile`

This works, but the configuration then lives in the dashboard rather than in
git, and must be re-applied for every new environment. Prefer the committed
setup above.

---

## Related

- `server/render.yaml` — Render blueprint, an alternative host. Unaffected by
  these files; it uses `rootDir: server` with a Node runtime rather than Docker.
- `server/Dockerfile` — for building the API standalone from inside `server/`.
  If you change build steps, change them in both Dockerfiles.
- `web/vercel.json` — frontend deployment. Untouched.
