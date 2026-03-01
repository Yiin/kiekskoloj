# Implementation Order

Phased approach. Each phase produces a working app with progressively more features.

## Phase 1 — Foundation

**Goal**: Monorepo scaffolding, auth, basic group CRUD

1. Initialize monorepo (bun workspaces, bunfig.toml, root package.json)
2. Create shared package with types and constants
3. Scaffold Elysia backend with database setup (Drizzle + SQLite)
4. Define database schema and push initial migration
5. Implement auth endpoints (register, login, logout, /me)
6. Scaffold Vue frontend (Vite + shadcn-vue init + Tailwind v4)
7. Set up router, Pinia, layouts
8. Build auth pages (login, register)
9. Build auth composable + route guards
10. Set up Makefile and caddy-local
11. Verify end-to-end: register → login → see empty dashboard

## Phase 2 — Groups & Members

**Goal**: Create groups, manage members, join via invite link

1. Group CRUD endpoints
2. Group member management endpoints
3. Invite link generation + join endpoint
4. GroupListPage with GroupCard components
5. GroupDetailPage shell (tabs: expenses, balances, settings)
6. GroupSettingsPage with member management
7. JoinGroupPage
8. Group creation dialog

## Phase 3 — Expenses & Splits

**Goal**: Full expense creation with all split methods

1. Expense CRUD endpoints with validation
2. Expense payers and splits logic
3. Equal split implementation
4. Percentage split implementation
5. Amount split implementation
6. Shares/weight split implementation
7. ExpenseListPage with ExpenseCard
8. ExpenseFormPage with all split method UIs
9. PayerSelector (single + multi-payer)
10. SplitMethodSelector with per-method configuration

## Phase 4 — Balances & Settlements

**Goal**: See who owes what, settle debts

1. Balance computation endpoint
2. Debt simplification algorithm (shared package)
3. BalanceSummary component
4. DebtList component
5. Settlement CRUD endpoints
6. SettleDialog component
7. SettlementsPage with history

## Phase 5 — Multi-Currency

**Goal**: Expenses in any currency, auto-conversion

1. Exchange rate fetching service (frankfurter.app)
2. Exchange rates caching in SQLite
3. Currency endpoints
4. CurrencySelect component
5. CurrencyInput component
6. Per-expense currency selection in ExpenseForm
7. Rate-aware balance computation

## Phase 6 — Categories & Items

**Goal**: Categorize expenses, item-level splitting

1. Category CRUD endpoints
2. Default category presets
3. Category management in GroupSettingsPage
4. Category selector in ExpenseForm
5. Item-level split (expense_items + expense_item_splits)
6. ItemSplitter component in ExpenseForm

## Phase 7 — Receipts & Files

**Goal**: Upload receipt photos

1. File upload endpoint with validation (size, mime type)
2. Receipt storage (disk-based, served by Elysia static)
3. ReceiptUpload component (drag-drop + tap)
4. Receipt viewer (lightbox/dialog)
5. Receipt attachment in ExpenseForm

## Phase 8 — Real-Time & Notifications

**Goal**: Live updates across devices

1. WebSocket server implementation (Elysia WS)
2. Connection manager (user → sockets, group → users)
3. Broadcast on mutations
4. useWebSocket composable (connect, subscribe, reconnect)
5. Pinia store integration (patch state on WS messages)
6. Activity log table + endpoints
7. Activity feed component on GroupDetailPage
8. In-app notification badges

## Phase 9 — Statistics & Export

**Goal**: Charts, data export

1. Stats computation (server-side aggregation)
2. CategoryChart, MemberChart, TimelineChart components
3. StatsPage with filters
4. CSV export endpoint
5. Excel export endpoint (xlsx package)
6. PDF export endpoint
7. Export UI in GroupSettingsPage

## Phase 10 — Recurring & Scheduling

**Goal**: Auto-create recurring expenses

1. Recurring expense CRUD endpoints
2. Template storage (JSON config)
3. Background cron for due recurring expenses
4. Recurring expense management UI in GroupSettingsPage
5. "Create recurring" option in ExpenseForm

## Phase 11 — PWA & Offline

**Goal**: Installable app, works offline

1. vite-plugin-pwa configuration
2. Service worker with caching strategies
3. Offline detection composable
4. Offline mutation queue (IndexedDB via Pinia plugin)
5. Sync-on-reconnect logic
6. Conflict resolution UI
7. OfflineIndicator component
8. Push notification setup (web-push)

## Phase 12 — i18n & Polish

**Goal**: Multi-language, final polish

1. vue-i18n setup with lazy-loaded locales
2. Extract all strings to locale files
3. English (en) as base language
4. Add 2-3 additional languages
5. Date/number/currency formatting via i18n
6. Locale selector in settings
7. Dark mode polish
8. Mobile responsive pass
9. Accessibility audit
10. Error states and empty states for all pages

## Phase 13 — Docker & Production

**Goal**: Production-ready deployment

1. Write Dockerfiles (server + web)
2. Write docker-compose.yml with Caddy
3. Production Caddyfile
4. Environment variable management
5. SQLite backup strategy
6. Health check endpoints
7. Test full production deploy
