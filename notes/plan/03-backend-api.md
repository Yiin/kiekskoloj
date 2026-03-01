# Backend API

Elysia 1.4 on Bun. All endpoints under `/api` prefix. JSON request/response. JWT auth via httpOnly cookies.

## Authentication

### Flow

1. **Register** — hash password with `Bun.password.hash()`, create user, return JWT in httpOnly cookie
2. **Login** — verify with `Bun.password.verify()`, return JWT in httpOnly cookie
3. **Logout** — clear cookie
4. **Auth guard** — `derive` hook extracts user from JWT cookie, `beforeHandle` rejects if missing

### JWT Config

```typescript
jwt({
  name: "jwt",
  secret: Bun.env.JWT_SECRET,
  exp: "7d",
  cookie: {
    httpOnly: true,
    secure: true, // in production
    sameSite: "lax",
    path: "/"
  }
})
```

## API Endpoints

### Auth — `/api/auth`

| Method | Path              | Body / Params                        | Response              |
| ------ | ----------------- | ------------------------------------ | --------------------- |
| POST   | /register         | { email, name, password }            | { user }              |
| POST   | /login            | { email, password }                  | { user }              |
| POST   | /logout           |                                      | 204                   |
| GET    | /me               |                                      | { user }              |
| PUT    | /me               | { name?, locale?, avatar? }          | { user }              |
| PUT    | /me/password      | { current, new }                     | 204                   |

### Groups — `/api/groups`

| Method | Path                        | Body / Params                         | Response                |
| ------ | --------------------------- | ------------------------------------- | ----------------------- |
| GET    | /                           | ?archived=bool                        | { groups[] }            |
| POST   | /                           | { name, currency, color? }            | { group }               |
| GET    | /:id                        |                                       | { group, members, balances } |
| PUT    | /:id                        | { name?, currency?, color?, archived? }| { group }              |
| DELETE | /:id                        |                                       | 204                     |
| POST   | /:id/members                | { name, weight?, userId? }            | { member }              |
| PUT    | /:id/members/:memberId      | { name?, weight?, role?, active? }    | { member }              |
| DELETE | /:id/members/:memberId      |                                       | 204                     |
| GET    | /:id/balances               |                                       | { balances[], debts[] } |
| POST   | /:id/invite/regenerate      |                                       | { inviteCode }          |
| POST   | /join/:inviteCode           |                                       | { group }               |

### Expenses — `/api/groups/:groupId/expenses`

| Method | Path              | Body / Params                                       | Response           |
| ------ | ----------------- | --------------------------------------------------- | ------------------ |
| GET    | /                 | ?page, ?limit, ?from, ?to, ?category, ?member       | { expenses[], total } |
| POST   | /                 | { title, amount, currency?, date, splitMethod, payers[], splits[], items?, categoryId?, note? } | { expense } |
| GET    | /:id              |                                                     | { expense, payers, splits, items, receipts } |
| PUT    | /:id              | (same as POST body)                                 | { expense }        |
| DELETE | /:id              |                                                     | 204                |

### Settlements — `/api/groups/:groupId/settlements`

| Method | Path              | Body                                    | Response           |
| ------ | ----------------- | --------------------------------------- | ------------------ |
| GET    | /                 | ?page, ?limit                           | { settlements[] }  |
| POST   | /                 | { fromId, toId, amount, currency, date, note? } | { settlement } |
| DELETE | /:id              |                                         | 204                |

### Categories — `/api/groups/:groupId/categories`

| Method | Path              | Body                        | Response           |
| ------ | ----------------- | --------------------------- | ------------------ |
| GET    | /                 |                             | { categories[] }   |
| POST   | /                 | { name, icon?, color? }     | { category }       |
| PUT    | /:id              | { name?, icon?, color? }    | { category }       |
| DELETE | /:id              |                             | 204                |

### Recurring — `/api/groups/:groupId/recurring`

| Method | Path              | Body                                            | Response           |
| ------ | ----------------- | ------------------------------------------------ | ------------------ |
| GET    | /                 |                                                  | { recurring[] }    |
| POST   | /                 | { title, amount, currency?, frequency, splitMethod, template } | { recurring } |
| PUT    | /:id              | { ...partial, active? }                          | { recurring }      |
| DELETE | /:id              |                                                  | 204                |

### Receipts — `/api/groups/:groupId/expenses/:expenseId/receipts`

| Method | Path              | Body                    | Response           |
| ------ | ----------------- | ----------------------- | ------------------ |
| POST   | /                 | multipart: file         | { receipt }        |
| GET    | /:id              |                         | binary file stream |
| DELETE | /:id              |                         | 204                |

### Exports — `/api/groups/:groupId/export`

| Method | Path              | Query                   | Response           |
| ------ | ----------------- | ----------------------- | ------------------ |
| GET    | /csv              | ?from, ?to              | text/csv           |
| GET    | /xlsx             | ?from, ?to              | application/xlsx   |
| GET    | /pdf              | ?from, ?to              | application/pdf    |

### Currencies — `/api/currencies`

| Method | Path              | Query                   | Response           |
| ------ | ----------------- | ----------------------- | ------------------ |
| GET    | /                 |                         | { currencies[] }   |
| GET    | /rates            | ?base, ?symbols         | { rates }          |

### Activity — `/api/groups/:groupId/activity`

| Method | Path              | Query                   | Response           |
| ------ | ----------------- | ----------------------- | ------------------ |
| GET    | /                 | ?page, ?limit, ?since   | { activities[] }   |

## WebSocket — `/api/ws`

Single WebSocket connection per authenticated user. Server pushes group updates.

### Client → Server messages

```typescript
type ClientMessage =
  | { type: "subscribe"; groupId: string }
  | { type: "unsubscribe"; groupId: string }
  | { type: "ping" }
```

### Server → Client messages

```typescript
type ServerMessage =
  | { type: "expense:created"; groupId: string; expense: Expense }
  | { type: "expense:updated"; groupId: string; expense: Expense }
  | { type: "expense:deleted"; groupId: string; expenseId: string }
  | { type: "settlement:created"; groupId: string; settlement: Settlement }
  | { type: "settlement:deleted"; groupId: string; settlementId: string }
  | { type: "group:updated"; groupId: string; group: Group }
  | { type: "member:updated"; groupId: string; member: Member }
  | { type: "balances:updated"; groupId: string; balances: Balance[]; debts: Debt[] }
  | { type: "pong" }
```

### Connection management

- Auth via JWT cookie on upgrade
- Server tracks `userId → Set<WebSocket>` and `groupId → Set<userId>`
- On any mutation, broadcast to all group subscribers except the actor
- Heartbeat: client sends `ping` every 30s, server responds `pong`

## Middleware

### auth-guard.ts

```typescript
// derive: extract user from JWT cookie
// beforeHandle: reject 401 if no user
```

Applied to all routes except `/api/auth/login`, `/api/auth/register`, `/api/currencies`.

### group-access.ts

```typescript
// derive: resolve group membership from groupId param + user
// beforeHandle: reject 403 if not a member, or 403 if readonly + write operation
```

Applied to all `/api/groups/:groupId/*` routes.

## Recurring Expense Cron

A background interval (every hour) queries `recurring_expenses` where `next_date <= now AND active = 1`. For each match:

1. Create expense from template
2. Update `next_date` based on frequency
3. Broadcast via WebSocket

## Exchange Rates

Cache exchange rates in SQLite (table: `exchange_rates`). Fetch from a free API (e.g., exchangerate-api.com or frankfurter.app) daily. Fallback to cached rates when offline.

| Column     | Type    | Notes                  |
| ---------- | ------- | ---------------------- |
| base       | text    | base currency          |
| target     | text    | target currency        |
| rate       | real    | exchange rate          |
| fetched_at | integer | unix timestamp         |

## Error Handling

Standardized error response:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Human-readable description",
  "details": {}
}
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.

## OpenAPI

`@elysiajs/swagger` auto-generates docs at `/api/docs` from TypeBox schemas. Available in dev mode.
