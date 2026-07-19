# syntax=docker/dockerfile:1

# ==========================================================================
# The Secret Kitchen API — multi-stage build.
# Stage 1 compiles with the full toolchain; stage 2 ships only production
# dependencies and dist/, which keeps the runtime image small and removes the
# compiler from the attack surface.
# ==========================================================================

# --------------------------- Stage 1: build -------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copying manifests first means `npm ci` is only re-run when dependencies
# actually change, not on every source edit.
COPY package*.json ./
RUN npm ci

# The Prisma schema must be present before `prisma generate` runs inside build.
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Re-resolve node_modules with production dependencies only. The generated
# Prisma client lives inside node_modules, so it is regenerated afterwards.
RUN npm prune --omit=dev && npx prisma generate

# --------------------------- Stage 2: runtime -----------------------------
FROM node:22-alpine AS runner

# dumb-init reaps zombies and forwards SIGTERM to node, which is what makes
# the graceful shutdown in src/index.ts actually fire under Docker.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
WORKDIR /app

# node:22-alpine already ships an unprivileged `node` user (uid 1000).
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package.json ./

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
