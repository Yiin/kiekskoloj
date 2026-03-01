# Frontend

Vue 3.5 + Vite + shadcn-vue (Radix) + TailwindCSS v4 + Pinia.

## Pages & Routes

### Public

| Route               | Page              | Description                      |
| ------------------- | ----------------- | -------------------------------- |
| /login              | LoginPage         | Email/password login             |
| /register           | RegisterPage      | Create account                   |
| /join/:inviteCode   | JoinGroupPage     | Accept group invite (redirects to login if needed) |

### Authenticated

| Route                                  | Page              | Description                        |
| -------------------------------------- | ----------------- | ---------------------------------- |
| /                                      | GroupListPage     | All groups (with archived toggle)  |
| /groups/:id                            | GroupDetailPage   | Expense list, balances, debts      |
| /groups/:id/expenses/new               | ExpenseFormPage   | Create expense                     |
| /groups/:id/expenses/:expenseId        | ExpenseFormPage   | Edit expense                       |
| /groups/:id/settlements                | SettlementsPage   | Settlement history + record new    |
| /groups/:id/stats                      | StatsPage         | Charts and analytics               |
| /groups/:id/settings                   | GroupSettingsPage  | Members, categories, recurring, export |
| /settings                              | SettingsPage      | User profile, locale, theme        |

## Layouts

### AppLayout

- Sidebar (collapsible on mobile) with group list
- Top bar with current group name, user avatar, theme toggle
- Main content area
- Bottom nav on mobile (groups, add expense FAB, settings)

### AuthLayout

- Centered card layout for login/register forms

## Key Components

### Group Module

**GroupCard.vue** — Card showing group name, color, member count, total balance summary. Used in GroupListPage grid.

**BalanceSummary.vue** — Shows each member's net balance (positive = owed, negative = owes). Color coded green/red.

**DebtList.vue** — Simplified debts after running the debt simplification algorithm. Shows "A pays B $X" with a "Settle" button on each row.

**MemberList.vue** — Manage members: add, edit weight, change role, deactivate. Shows offline members distinctly.

**GroupForm.vue** — Dialog for creating/editing groups. Fields: name, default currency (searchable select), color picker.

### Expense Module

**ExpenseCard.vue** — List item showing title, amount, date, category icon, who paid. Tap to expand and show split details.

**ExpenseForm.vue** — Full-page form with sections:
1. **Basic info** — title, amount, currency, date, category, note
2. **Who paid** — single payer (default) or multi-payer toggle with amount inputs per person
3. **Split method selector** — tabs: Equal | Percentage | Amount | Shares | By Item
4. **Split configuration** — varies by method:
   - Equal: checkboxes to include/exclude members
   - Percentage: slider/input per member (must total 100%)
   - Amount: input per member (must total expense amount)
   - Shares: number input per member
   - By Item: add items with price, assign members to each item
5. **Receipt** — photo upload area

**SplitMethodSelector.vue** — Tab group switching between split methods. Updates the split configuration section reactively.

**PayerSelector.vue** — Dropdown for single payer, expandable multi-payer with amount fields.

**ItemSplitter.vue** — For "By Item" split. Add/remove items, set price, check which members share each item.

**ReceiptUpload.vue** — Drag-and-drop or tap to upload. Preview thumbnail. Delete button.

### Settlement Module

**SettleDialog.vue** — Dialog to record a payment. Pre-filled from debt simplification suggestion. Fields: from, to, amount, date, note.

### Stats Module

**CategoryChart.vue** — Donut/pie chart of spending by category. Uses shadcn-vue chart components (Unovis).

**MemberChart.vue** — Bar chart of spending per member (paid vs. owed).

**TimelineChart.vue** — Line/area chart of group spending over time.

**StatFilters.vue** — Date range picker, category filter, member filter.

### Shared Components

**CurrencyInput.vue** — Number input with currency symbol prefix. Formats on blur.

**CurrencySelect.vue** — Searchable combobox of all currencies. Shows code + name + symbol.

**MemberAvatar.vue** — Circle with initials or uploaded avatar. Color from member/group.

**EmptyState.vue** — Illustrated placeholder for empty lists.

**OfflineIndicator.vue** — Banner/toast showing offline status and pending sync count.

## Stores (Pinia)

### auth.ts

```typescript
state: { user, isAuthenticated }
actions: { login, register, logout, updateProfile }
```

### groups.ts (per GroupDetailPage)

```typescript
state: { group, members, expenses, settlements, balances, debts }
actions: { fetchGroup, addExpense, updateExpense, deleteExpense, addSettlement, ... }
getters: { activeMembersCount, totalBalance, simplifiedDebts }
```

Receives WebSocket updates and patches state reactively.

### ui.ts

```typescript
state: { theme, locale, sidebarOpen }
actions: { toggleTheme, setLocale, toggleSidebar }
```

Persists to localStorage.

### sync.ts

```typescript
state: { queue: OfflineAction[], isSyncing }
actions: { enqueue, processQueue, clearQueue }
```

When offline, mutations are queued. On reconnect, queue is processed in order.

## Composables

### useApi.ts

Fetch wrapper:
- Base URL: `/api` (proxied in dev via vite or caddy-local)
- Auto-includes credentials (cookies)
- Parses JSON responses
- Throws typed errors
- When offline, delegates to sync store queue

### useWebSocket.ts

- Connects to `/api/ws` on auth
- Auto-reconnect with exponential backoff
- Subscribes to active group
- Routes incoming messages to relevant Pinia stores
- Heartbeat ping every 30s

### useAuth.ts

- Wraps auth store with route guards
- Auto-redirects to /login on 401
- Provides `requireAuth` guard for router

### useOffline.ts

- Tracks `navigator.onLine` + WebSocket connection state
- Provides `isOffline` ref
- Triggers sync on reconnect

## PWA Configuration

```typescript
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Kiekskoloj",
    short_name: "Kiekskoloj",
    theme_color: "#f2774a",
    background_color: "#ffffff",
    display: "standalone",
    icons: [/* ... */]
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: "NetworkFirst",
        options: { cacheName: "api-cache", expiration: { maxEntries: 200, maxAgeSeconds: 86400 } }
      }
    ]
  }
})
```

## i18n

- Locale files in `public/locales/{lang}.json`
- Lazy-loaded on locale change
- Default: English
- User preference stored in user profile (synced) and localStorage (fallback)
- Date/number formatting via vue-i18n's built-in formatters
- Currency formatting: `Intl.NumberFormat` with currency code

## Theme

shadcn-vue CSS variables with light/dark mode. Custom accent color matching the app brand (#f2774a warm orange). Toggle via class on `<html>`. Stored in localStorage.

## Vite Dev Config

```typescript
export default defineConfig({
  server: {
    port: 5176,
    proxy: {
      "/api": {
        target: "http://localhost:3006",
        ws: true  // proxy WebSocket too
      }
    }
  }
})
```

This means in dev, no CORS issues — everything goes through localhost:5176 and Vite proxies `/api` to the backend.
