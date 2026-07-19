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
# This is the ONLY Dockerfile in the repository, and railway.toml pins the
# build to it by path. There was previously a second one in server/; the two
# drifted apart, and editing that one had no effect on the deploy because
# Railway never read it. Keep it that way — one image definition, one truth.
#
# BASE IMAGE: Debian, not Alpine. prisma/schema.prisma declares the binary
# target `debian-openssl-3.0.x`. Alpine is musl and would need
# `linux-musl-openssl-3.0.x`; running the Debian engine there is what produced
# "Prisma failed to detect libssl" and "Could not parse schema engine
# response" at runtime. The image and the declared target must agree.
# ==========================================================================

# --------------------------- Stage 1: build -------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Prisma's query engine links against OpenSSL. bookworm-slim ships without it,
# and without this the engine fails to load rather than failing to build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Manifests first: this layer is only invalidated when dependencies actually
# change, so ordinary source edits reuse the cached `npm ci`.
COPY server/package.json server/package-lock.json ./
RUN npm ci

# The schema must land before `npm run build`, because that script now runs
# `prisma generate` ahead of tsc. It previously did not: `build` was a bare
# `tsc`, so the compiler met an ungenerated @prisma/client and failed with ~124
# errors of the form "Module '@prisma/client' has no exported member
# 'OrderStatus'". Generation is not optional — every model, enum and
# `Prisma.*WhereInput` type the API imports is emitted by it.
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
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma

# `prisma` is a production dependency, not a dev one, so it survives
# --omit=dev. It has to: this stage generates the client, and Railway's
# preDeployCommand runs `prisma migrate deploy` against the runtime image.
#
# It used to be a devDependency, on the assumption that the CLI arrived
# transitively via @prisma/client. It does not — @prisma/client@5 declares no
# dependencies at all — so `npx --no-install prisma generate` had nothing to
# run. `--no-install` is kept deliberately: it makes this fail loudly at build
# time rather than silently downloading the CLI on every deploy.
RUN npm ci --omit=dev && npx --no-install prisma generate

# --------------------------- Stage 3: runtime -----------------------------
FROM node:22-bookworm-slim AS runner

# dumb-init reaps zombies and forwards SIGTERM to node, which is what makes the
# graceful shutdown in src/index.ts actually fire under a container runtime.
# Without it node runs as PID 1 and ignores SIGTERM, so Railway would hard-kill
# the process mid-request on every redeploy.
#
# openssl is required here too, not just at build time — the query engine loads
# it in the running container.
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# node:22-bookworm-slim already ships an unprivileged `node` user (uid 1000).
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
