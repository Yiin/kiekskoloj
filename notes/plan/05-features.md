# Feature Implementation Details

## 1. Debt Simplification Algorithm

The core algorithm that minimizes the number of transactions needed to settle all debts within a group.

### Input

For each member, compute their **net balance**:
```
net[member] = sum(what they paid) - sum(what they owe)
```

Positive = they are owed money. Negative = they owe money.

### Algorithm (Greedy Min-Transactions)

1. Compute net balance for each member
2. Separate into creditors (positive balance) and debtors (negative balance)
3. Sort creditors descending, debtors ascending (by absolute value)
4. Match largest creditor with largest debtor:
   - Transfer `min(creditor_balance, |debtor_balance|)`
   - Reduce both balances
   - Remove anyone who reaches zero
5. Repeat until all balances are zero

This greedy approach is O(n log n) and produces at most `n-1` transactions. For the general optimal solution (minimum number of transactions), NP-hard subset-sum would be needed, but greedy is what SettleUp and Splitwise use — it's good enough and fast.

### Implementation

Lives in `packages/shared/src/utils/debt-simplify.ts` so both frontend (for preview) and backend (for suggestions) can use it.

```typescript
interface Debt {
  from: string    // member ID
  to: string      // member ID
  amount: number  // in group currency
}

function simplifyDebts(balances: Map<string, number>): Debt[]
```

## 2. Multi-Currency Handling

### Per-Expense Currency

Each expense stores its own `currency` and `exchange_rate` (to the group's default currency at time of creation).

When computing balances:
- All amounts are converted to the group's default currency using the stored `exchange_rate`
- This preserves historical accuracy — the rate at time of expense is locked in

### Exchange Rate Fetching

- Backend fetches rates daily from frankfurter.app (free, no API key, ECB data)
- Cached in `exchange_rates` table
- Frontend shows a currency selector with search
- When user picks a non-default currency for an expense, the current rate is fetched and stored

### Display

- Expenses show in their original currency
- Balances always show in group default currency
- Debts show in group default currency

## 3. Split Methods

### Equal

All selected members share equally: `amount / selected_count`.
UI: Checkboxes to include/exclude each member.

### By Percentage

Each member assigned a percentage. Must total 100%.
UI: Percentage input per member. Live validation showing remaining %.

### By Exact Amount

Each member assigned a fixed amount. Must total the expense amount.
UI: Currency input per member. Live validation showing remaining amount.

### By Shares/Weight

Each member assigned share count. Amount split proportionally.
UI: Number stepper per member. Uses member's default weight as initial value.
Formula: `member_amount = (member_shares / total_shares) * amount`

### By Item

Items are listed with prices. Each item assigned to specific members.
UI: Item list with name, price, and member checkboxes. Each item split equally among its assigned members. Sum of items should equal total (remainder handled as "other" split equally).

## 4. Recurring Expenses

### Configuration

- Frequency: daily, weekly, monthly, yearly
- Template: stores the full expense config (payers, splits, category, etc.) as JSON
- `next_date`: when the next instance should be created

### Processing

Server runs a background interval (hourly):

```typescript
setInterval(async () => {
  const due = await db.select()
    .from(recurringExpenses)
    .where(and(
      lte(recurringExpenses.nextDate, Date.now()),
      eq(recurringExpenses.active, 1)
    ))

  for (const template of due) {
    await createExpenseFromTemplate(template)
    await updateNextDate(template)
  }
}, 60 * 60 * 1000)
```

### Next Date Calculation

```typescript
function getNextDate(current: number, frequency: string): number {
  const d = new Date(current)
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.getTime()
}
```

## 5. Offline Support

### Strategy

PWA with service worker (vite-plugin-pwa + Workbox).

**Static assets**: Cache-first (pre-cached on install).
**API requests**: Network-first with cache fallback.

### Offline Mutations

When offline, write operations are queued in the `sync` Pinia store (persisted to IndexedDB via a Pinia plugin):

```typescript
interface OfflineAction {
  id: string
  method: "POST" | "PUT" | "DELETE"
  url: string
  body?: unknown
  timestamp: number
}
```

On reconnect:
1. Process queue in order (FIFO)
2. For each action, send to server
3. If conflict (409), show user a resolution dialog
4. Clear queue entry on success
5. Refresh all active group data

### Conflict Resolution

Conflicts arise when the same expense is edited offline by two users. Strategy:
- Server returns 409 with the current server version
- Frontend shows diff and lets user choose (keep mine / keep theirs / merge)

## 6. Real-Time Sync

### Architecture

Single WebSocket per user session. User subscribes to group channels.

When viewing a group page:
- Subscribe to that group's channel
- Receive live updates for expenses, settlements, member changes, balance recalculations
- Pinia store patches state on incoming messages

When leaving a group page:
- Unsubscribe from that group's channel

### Server Broadcasting

Every mutation endpoint, after success:
1. Logs to `activity_log`
2. Broadcasts to all WebSocket connections subscribed to that group
3. Skips the connection that triggered the mutation (they already have the update)

## 7. Export

### CSV

Stream response. Columns: Date, Title, Amount, Currency, Category, Paid By, Split Details, Note.

### Excel (.xlsx)

Use `xlsx` npm package (SheetJS). Multiple sheets:
- **Expenses** — all expenses with details
- **Settlements** — all settlement records
- **Balances** — current member balances
- **Summary** — totals by category, by member

### PDF

Use `pdfkit` or `@react-pdf/renderer` equivalent for Node. Generates a formatted report:
- Group name, date range, members
- Expense table
- Balance summary
- Simplified debts

## 8. Notifications

### In-App

Activity log feed on group detail page. New items highlighted. Badge count on group card in sidebar.

### Push (PWA)

Web Push API via service worker. User opts in per group. Triggered for:
- New expense added (you're involved)
- Settlement recorded (you're involved)
- New member joined
- Recurring expense created

Backend sends push via `web-push` npm package. Stores push subscriptions in a `push_subscriptions` table.

## 9. Statistics

### Per-Group Charts

Powered by shadcn-vue chart components (built on Unovis).

**Spending by Category** — Donut chart. Filter by date range.
**Spending by Member** — Stacked bar chart. Shows paid vs. share for each member.
**Spending Over Time** — Area chart. Monthly or weekly aggregation.
**Balance History** — Line chart showing each member's running balance over time.

### Filters

- Date range picker (shadcn-vue calendar)
- Category multi-select
- Member multi-select

### Data Computation

Stats are computed client-side from the expense list (already loaded). For large groups, the backend provides a `/api/groups/:id/stats` endpoint with pre-aggregated data.

## 10. Group Sharing

### Invite Link

Each group has a unique `invite_code`. Link format: `https://kiekskoloj.local/join/{invite_code}`.

- Anyone with the link can join (creates a group_member with role 'member')
- Admin can regenerate invite code (invalidates old links)
- Admin can disable invites by clearing the code

### Read-Only Access

Members with role 'readonly' can:
- View all expenses, settlements, balances, stats
- Cannot add/edit/delete expenses or settlements
- Cannot modify group settings

## 11. Non-App Members

Groups can include people who don't have accounts. These are `group_members` with `user_id = null`:
- They have a display name and weight
- Expenses can be split with them
- They appear in balances and debts
- They cannot log in or receive notifications
- An admin manages their entries

When a non-app member later creates an account, they can be "claimed" — linking their user_id to the existing group_member record, preserving all history.
