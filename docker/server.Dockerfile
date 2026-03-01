FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN cd apps/server && bun build src/index.ts --outdir dist --target bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/apps/server/dist .
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /data/uploads
EXPOSE 3006
CMD ["bun", "run", "index.js"]
