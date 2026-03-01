FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN bun install
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN cd apps/web && bun run build

FROM alpine:3.19
COPY --from=builder /app/apps/web/dist /app/dist
