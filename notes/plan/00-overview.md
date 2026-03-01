# Kiekskoloj — Overview

> "Kiekskoloj" — Esperanto for "settle up" / "who owes what"

A full-featured group expense splitting app. Replaces SettleUp with a self-hosted, open-source alternative.

## Stack

| Layer      | Tech                                          |
| ---------- | --------------------------------------------- |
| Runtime    | Bun                                           |
| Frontend   | Vue 3.5 + Vite + shadcn-vue 2.3 (Radix)      |
| Backend    | Elysia 1.4 (Bun-native HTTP framework)        |
| Database   | SQLite via bun:sqlite + Drizzle ORM           |
| Validation | TypeBox (backend) + Zod (frontend forms)      |
| State      | Pinia                                         |
| Styling    | TailwindCSS v4 + shadcn-vue CSS variables     |
| Auth       | JWT (@elysiajs/jwt) + httpOnly cookies        |
| Realtime   | Elysia WebSocket (native Bun WS)              |
| i18n       | vue-i18n v9                                   |
| PWA        | vite-plugin-pwa (offline-first)               |
| Deploy     | Docker Compose (Caddy + Bun containers)       |
| Dev        | Makefile, caddy-local (`kiekskoloj.local`)     |

## Ports (dev)

| Service  | Port |
| -------- | ---- |
| Frontend | 5176 |
| Backend  | 3006 |

These avoid conflicts with existing caddy-local entries (80, 3001, 3005, 5130, 5173, 5174, 5175).

## Monorepo Structure

```
kiekskoloj/
├── apps/
│   ├── web/              # Vue 3 frontend
│   └── server/           # Elysia backend
├── packages/
│   └── shared/           # Shared types, validation schemas, constants
├── docker-compose.yml
├── Makefile
├── bunfig.toml
└── notes/plan/
```

Bun workspaces manage the monorepo. Shared package provides type-safe contracts between frontend and backend.

## Feature Scope

Full SettleUp parity:

1. **Groups** — create, join via link, manage members, colors, archived groups
2. **Expenses** — add/edit/delete, multi-payer, item-level splits
3. **Split methods** — equal, by percentage, by amount, by weight/shares
4. **Debt simplification** — minimize transaction count algorithmically
5. **Multi-currency** — all currencies, real-time exchange rates, per-expense currency
6. **Settlements** — record payments, mark debts as settled
7. **Recurring expenses** — rent, subscriptions with auto-creation
8. **Categories** — pre-defined + custom, per-group
9. **Receipt photos** — upload and attach to expenses
10. **Statistics** — charts, per-member breakdowns, category analysis
11. **Export** — CSV, Excel (.xlsx), PDF
12. **Notifications** — in-app + push (PWA) for changes
13. **Offline support** — PWA with service worker, sync on reconnect
14. **Real-time sync** — WebSocket for live updates across devices
15. **i18n** — multi-language support (20+ languages)
16. **Auth** — email/password registration, JWT sessions
17. **Read-only access** — share groups with view-only permissions
