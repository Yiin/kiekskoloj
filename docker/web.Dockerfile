FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN bun install
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN cd apps/web && bun run build

FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /srv/web
COPY docker/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
