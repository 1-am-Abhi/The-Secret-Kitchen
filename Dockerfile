# syntax=docker/dockerfile:1

# ==========================================================================
# The Secret Kitchen API — Railway production image.
#
# WHY THIS LIVES AT THE REPOSITORY ROOT
# Railway builds with the repository root as the Docker build context. A
# Dockerfile inside server/ cannot `COPY` anything, because every path it
# references would sit outside its own context. Keeping this file at the root
# means Railway needs no "Root Directory" setting in the dashboard — the whole
# deployment is described by files in git, so a new environment or a PR
# environment builds identically with nothing to remember.
#
# Everything it copies is scoped to server/. The Next.js app in web/ is never
# read (and is excluded from the context entirely by .dockerignore).
#
# `server/Dockerfile` still exists for running the API standalone from inside
# that directory. If you change build steps in one, change them in both.
# ==========================================================================

# --------------------------- Stage 1: build -------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Manifests first: this layer is only invalidated when dependencies actually
# change, so ordinary source edits reuse the cached `npm ci`.
COPY server/package.json server/package-lock.json ./
RUN npm ci

# The Prisma schema must be present before `npm run build`, which runs
# `prisma generate` ahead of tsc.
COPY server/prisma ./prisma
COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# --------------------------- Stage 2: prod deps ---------------------------
# A clean production-only install, rather than pruning the builder's tree —
# pruning in place leaves the builder's dev artefacts sitting in the layer.
#
# The Prisma client is GENERATED here rather than copied across from the
# builder. Copying is deceptively fragile: it depends on the exact merge
# semantics of COPY into an existing directory, and a stale or half-copied
# client fails at runtime with "@prisma/client did not initialize yet" — a
# crash on boot, long after the build reported success.
FROM node:22-alpine AS deps

WORKDIR /app

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma

# The Prisma CLI arrives transitively (@prisma/client depends on prisma), so it
# is present even under --omit=dev. `--no-install` is deliberate: it makes the
# build FAIL LOUDLY if a future Prisma upgrade stops shipping the CLI that way,
# rather than silently downloading it here and again on every deploy.
RUN npm ci --omit=dev && npx --no-install prisma generate

# --------------------------- Stage 3: runtime -----------------------------
FROM node:22-alpine AS runner

# dumb-init reaps zombies and forwards SIGTERM to node, which is what makes the
# graceful shutdown in src/index.ts actually fire under a container runtime.
# Without it node runs as PID 1 and ignores SIGTERM, so Railway would hard-kill
# the process mid-request on every redeploy.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# node:22-alpine already ships an unprivileged `node` user (uid 1000).
COPY --from=deps    --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node server/package.json ./

USER node

# Documentation only. Railway assigns the real port via $PORT, which
# src/config/env.ts reads (defaulting to 4000 for local runs).
EXPOSE 4000

# Railway performs its own healthcheck against healthcheckPath in railway.toml;
# this one covers `docker run` and any other orchestrator.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
