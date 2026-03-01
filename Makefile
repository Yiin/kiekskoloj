.PHONY: dev dev-web dev-server setup db-push db-studio build test lint

# Development
dev:
	$(MAKE) -j2 dev-web dev-server

dev-web:
	cd apps/web && bun run dev

dev-server:
	cd apps/server && bun run --watch src/index.ts

# Setup
setup:
	bun i
	caddy-local add kiekskoloj 5176

# Database
db-push:
	cd apps/server && bun run drizzle-kit push

db-studio:
	cd apps/server && bun run drizzle-kit studio

# Build
build:
	cd apps/web && bun run build

# Test
test:
	cd apps/server && bun test
	cd apps/web && bun run test

test-server:
	cd apps/server && bun test

test-web:
	cd apps/web && bun run test
