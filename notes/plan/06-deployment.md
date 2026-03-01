# Deployment

## Docker Compose

Three services: Caddy (reverse proxy + TLS), backend (Bun + Elysia), frontend (Bun + Vite build served by Caddy).

### docker-compose.yml

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - web_dist:/srv/web
    depends_on:
      web:
        condition: service_completed_successfully

  server:
    build:
      context: .
      dockerfile: docker/server.Dockerfile
    restart: unless-stopped
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_PATH=/data/kiekskoloj.db
      - UPLOAD_PATH=/data/uploads
      - PORT=3006
      - NODE_ENV=production
    volumes:
      - server_data:/data
    expose:
      - "3006"

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    volumes:
      - web_dist:/app/dist

volumes:
  caddy_data:
  caddy_config:
  server_data:
  web_dist:
```

### docker/server.Dockerfile

```dockerfile
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
COPY --from=builder /app/apps/server/node_modules ./node_modules
RUN mkdir -p /data/uploads
EXPOSE 3006
CMD ["bun", "run", "index.js"]
```

### docker/web.Dockerfile

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN cd apps/web && bun run build

FROM alpine:3.19
COPY --from=builder /app/apps/web/dist /app/dist
```

The web container is an init container — it just builds the frontend and copies the dist to a shared volume. Caddy serves the static files.

### docker/Caddyfile

```caddyfile
{$DOMAIN:localhost} {
    handle /api/* {
        reverse_proxy server:3006
    }

    handle {
        root * /srv/web
        try_files {path} /index.html
        file_server
    }

    encode gzip zstd
}
```

### .env (production)

```env
DOMAIN=kiekskoloj.example.com
JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

## Data Persistence

- **Database**: SQLite file at `/data/kiekskoloj.db` inside `server_data` volume
- **Uploads**: Receipt images at `/data/uploads/` inside `server_data` volume
- **Caddy**: TLS certs and config in `caddy_data` and `caddy_config` volumes

## Backup

SQLite makes backup simple:
- Volume mount the `server_data` volume to host
- Periodic `sqlite3 kiekskoloj.db ".backup backup.db"` via cron
- Or use Litestream for continuous SQLite replication

## Development Setup

```bash
# First time
make setup       # bun install + caddy-local setup

# Daily dev
make dev         # runs frontend (5176) + backend (3006) concurrently
```

caddy-local routes:
```
kiekskoloj.local     → localhost:5176  (frontend)
kiekskoloj.local/api/* → localhost:3006  (backend, via vite proxy in dev)
```

In dev mode, Vite's built-in proxy handles `/api` → `:3006`, so caddy-local only needs to point to the frontend. The `/api/*` caddy-local route is optional but useful for testing production-like routing.

## Production Deployment

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Update
git pull && docker compose up -d --build
```
