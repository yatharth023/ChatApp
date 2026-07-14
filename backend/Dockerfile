### syntax=docker/dockerfile:1.6

# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# ---------- prisma ----------
FROM deps AS prisma-build
COPY prisma ./prisma
RUN npx prisma generate

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# The base image already ships with a non-root `node` user at UID/GID 1000
# (creating our own here fails with "GID 1000 already exists"), so we reuse
# it and just make sure /app is writable by that user.
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=4000

COPY --chown=node:node --from=deps      /app/node_modules ./node_modules
COPY --chown=node:node --from=prisma-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
