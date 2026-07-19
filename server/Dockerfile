# syntax=docker/dockerfile:1

# ==========================================================================
# The Secret Kitchen API — Multi-stage Production Dockerfile
# ==========================================================================

# --------------------------- Stage 1: Build -------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Build application
RUN npm run build

# Keep only production dependencies
RUN npm prune --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# --------------------------- Stage 2: Runtime -----------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install runtime packages
RUN apt-get update && \
    apt-get install -y dumb-init openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy application
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