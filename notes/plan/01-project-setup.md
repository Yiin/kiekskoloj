# Project Setup

## 1. Initialize Monorepo

```bash
bun init
```

### bunfig.toml

```toml
[workspace]
packages = ["apps/*", "packages/*"]
```

### Root package.json

```json
{
  "name": "kiekskoloj",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

## 2. Shared Package

```bash
mkdir -p packages/shared/src
```

Contains:
- **Types** — `Group`, `Expense`, `User`, `Settlement`, `Currency` etc.
- **Validation schemas** — Zod schemas used by both frontend forms and mirrored in backend TypeBox
- **Constants** — currency codes, category presets, split method enums
- **Utilities** — debt simplification algorithm, currency conversion helpers

```
packages/shared/
├── package.json          # name: @kiekskoloj/shared
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types/
    │   ├── group.ts
    │   ├── expense.ts
    │   ├── user.ts
    │   ├── settlement.ts
    │   └── currency.ts
    ├── constants/
    │   ├── currencies.ts
    │   ├── categories.ts
    │   └── split-methods.ts
    ├── validation/
    │   ├── expense.ts
    │   ├── group.ts
    │   └── auth.ts
    └── utils/
        ├── debt-simplify.ts
        └── currency.ts
```

## 3. Backend (Elysia)

```bash
cd apps && bun create elysia server
```

```
apps/server/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts              # App entry, compose controllers
│   ├── lib/
│   │   ├── db.ts             # bun:sqlite + Drizzle client
│   │   ├── auth.ts           # JWT plugin config
│   │   └── ws.ts             # WebSocket manager
│   ├── db/
│   │   ├── schema/           # Drizzle table definitions
│   │   │   ├── users.ts
│   │   │   ├── groups.ts
│   │   │   ├── expenses.ts
│   │   │   ├── settlements.ts
│   │   │   └── index.ts
│   │   └── migrations/       # Drizzle generated migrations
│   ├── features/
│   │   ├── auth/
│   │   │   ├── index.ts      # Elysia controller
│   │   │   └── service.ts    # Business logic
│   │   ├── groups/
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   ├── expenses/
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   ├── settlements/
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   ├── currencies/
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   ├── exports/
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   └── uploads/
│   │       ├── index.ts
│   │       └── service.ts
│   └── middleware/
│       ├── auth-guard.ts     # derive + beforeHandle for protected routes
│       └── group-access.ts   # Group membership / read-only checks
└── data/
    ├── kiekskoloj.db         # SQLite database file
    └── uploads/              # Receipt images
```

### Key dependencies

```bash
bun add elysia @elysiajs/jwt @elysiajs/cors @elysiajs/static @elysiajs/swagger
bun add drizzle-orm
bun add -d drizzle-kit
```

## 4. Frontend (Vue 3)

```bash
cd apps && bun create vite web --template vue-ts
cd web && npx shadcn-vue@radix init
```

```
apps/web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   ├── icons/                # PWA icons
│   └── locales/              # i18n JSON files (lazy-loaded)
│       ├── en.json
│       ├── lt.json
│       └── ...
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/
│   │   └── index.css         # Tailwind + shadcn-vue CSS variables
│   ├── components/
│   │   └── ui/               # shadcn-vue generated components
│   ├── composables/
│   │   ├── useApi.ts         # HTTP client (fetch wrapper)
│   │   ├── useWebSocket.ts   # WS connection + reconnect
│   │   ├── useAuth.ts        # Auth state + login/logout
│   │   └── useOffline.ts     # Offline queue management
│   ├── layouts/
│   │   ├── AppLayout.vue     # Authenticated shell
│   │   └── AuthLayout.vue    # Login/register
│   ├── lib/
│   │   └── utils.ts          # shadcn-vue utils (cn helper)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.vue
│   │   │   │   └── RegisterPage.vue
│   │   │   ├── components/
│   │   │   └── routes.ts
│   │   ├── groups/
│   │   │   ├── pages/
│   │   │   │   ├── GroupListPage.vue
│   │   │   │   ├── GroupDetailPage.vue
│   │   │   │   ├── GroupSettingsPage.vue
│   │   │   │   └── JoinGroupPage.vue
│   │   │   ├── components/
│   │   │   │   ├── GroupCard.vue
│   │   │   │   ├── MemberList.vue
│   │   │   │   └── BalanceSummary.vue
│   │   │   ├── store.ts
│   │   │   └── routes.ts
│   │   ├── expenses/
│   │   │   ├── pages/
│   │   │   │   ├── ExpenseListPage.vue
│   │   │   │   └── ExpenseFormPage.vue
│   │   │   ├── components/
│   │   │   │   ├── ExpenseCard.vue
│   │   │   │   ├── SplitMethodSelector.vue
│   │   │   │   ├── PayerSelector.vue
│   │   │   │   ├── ItemSplitter.vue
│   │   │   │   └── ReceiptUpload.vue
│   │   │   ├── store.ts
│   │   │   └── routes.ts
│   │   ├── settlements/
│   │   │   ├── pages/
│   │   │   │   └── SettlementsPage.vue
│   │   │   ├── components/
│   │   │   │   ├── DebtList.vue
│   │   │   │   └── SettleDialog.vue
│   │   │   ├── store.ts
│   │   │   └── routes.ts
│   │   ├── stats/
│   │   │   ├── pages/
│   │   │   │   └── StatsPage.vue
│   │   │   ├── components/
│   │   │   │   ├── CategoryChart.vue
│   │   │   │   ├── MemberChart.vue
│   │   │   │   └── TimelineChart.vue
│   │   │   └── routes.ts
│   │   └── settings/
│   │       ├── pages/
│   │       │   └── SettingsPage.vue
│   │       └── routes.ts
│   ├── router/
│   │   └── index.ts
│   └── stores/
│       ├── auth.ts           # Global auth store
│       ├── ui.ts             # Theme, locale, sidebar state
│       └── sync.ts           # Offline sync queue
```

### Key dependencies

```bash
bun add vue-router pinia vue-i18n @vueuse/core
bun add vee-validate @vee-validate/zod zod
bun add -d vite-plugin-pwa @vite-pwa/assets-generator
```

## 5. Makefile

```makefile
.PHONY: dev dev-web dev-server setup db-push db-studio lint

# Development
dev:
	$(MAKE) -j2 dev-web dev-server

dev-web:
	cd apps/web && bun run dev --port 5176

dev-server:
	cd apps/server && bun run --watch src/index.ts

# Setup
setup:
	bun i
	cd apps/web && npx shadcn-vue@radix init
	caddy-local add kiekskoloj 5176
	caddy-local add kiekskoloj /api/* 3006

# Database
db-push:
	cd apps/server && bun run drizzle-kit push

db-studio:
	cd apps/server && bun run drizzle-kit studio

# Production
build:
	cd apps/web && bun run build
	cd apps/server && bun build src/index.ts --outdir dist --target bun

docker:
	docker compose up --build

docker-down:
	docker compose down
```

## 6. caddy-local Configuration

```
kiekskoloj.local → localhost:5176       (frontend)
kiekskoloj.local/api/* → localhost:3006 (backend)
```

Single domain, path-based routing. The backend serves under `/api/` prefix. In production, the same pattern is replicated in docker-compose with Caddy.

## 7. TypeScript Configuration

Root `tsconfig.json` with project references. Each workspace package has its own `tsconfig.json` extending a shared base. Path alias `@kiekskoloj/shared` resolves to the shared package.
