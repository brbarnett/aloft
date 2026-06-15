# Stage 1: Build
FROM node:25-slim AS builder

RUN npm install -g pnpm

WORKDIR /build

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @aloft/web build
RUN pnpm --filter @aloft/api build

# Produce a self-contained API deployment (prod deps only, no workspace packages)
RUN pnpm --filter @aloft/api deploy --prod --legacy /deploy/api

# Stage 2: Production
FROM node:25-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /deploy/api ./api
COPY --from=builder /build/apps/api/dist ./api/dist

COPY --from=builder /build/apps/web/dist ./frontend

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 8080

CMD ["/app/start.sh"]
