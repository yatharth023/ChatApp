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

# Non-root
RUN groupadd -r app --gid=1000 && useradd -r -g app --uid=1000 --home /home/app --create-home app

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=4000

COPY --from=deps      /app/node_modules ./node_modules
COPY --from=prisma-build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY prisma ./prisma
COPY src ./src

USER app
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
