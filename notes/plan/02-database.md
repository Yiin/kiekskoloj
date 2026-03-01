# Database Schema

SQLite via `bun:sqlite` + Drizzle ORM. Single file database at `apps/server/data/kiekskoloj.db`.

## Tables

### users

| Column         | Type    | Notes                         |
| -------------- | ------- | ----------------------------- |
| id             | text    | PK, nanoid                    |
| email          | text    | unique, not null              |
| name           | text    | not null                      |
| password_hash  | text    | not null (Bun.password.hash)  |
| avatar_url     | text    | nullable                      |
| locale         | text    | default 'en'                  |
| created_at     | integer | unix timestamp                |
| updated_at     | integer | unix timestamp                |

### groups

| Column         | Type    | Notes                              |
| -------------- | ------- | ---------------------------------- |
| id             | text    | PK, nanoid                         |
| name           | text    | not null                           |
| currency       | text    | default group currency (ISO 4217)  |
| color          | text    | hex color for UI                   |
| invite_code    | text    | unique, for join-via-link          |
| archived       | integer | boolean (0/1), default 0           |
| created_by     | text    | FK → users.id                      |
| created_at     | integer | unix timestamp                     |
| updated_at     | integer | unix timestamp                     |

### group_members

| Column      | Type    | Notes                                    |
| ----------- | ------- | ---------------------------------------- |
| id          | text    | PK                                       |
| group_id    | text    | FK → groups.id                           |
| user_id     | text    | FK → users.id, nullable (for non-app members) |
| name        | text    | display name in group                    |
| weight      | real    | default 1.0 (for weighted splits)        |
| role        | text    | 'admin' / 'member' / 'readonly'          |
| active      | integer | boolean, default 1                       |
| joined_at   | integer | unix timestamp                           |

Composite unique: (group_id, user_id) where user_id is not null.
Members without user_id are "offline members" — people added to a group who don't have an account.

### categories

| Column   | Type    | Notes                                 |
| -------- | ------- | ------------------------------------- |
| id       | text    | PK                                    |
| group_id | text    | FK → groups.id, nullable (null = global preset) |
| name     | text    | not null                              |
| icon     | text    | emoji or icon name                    |
| color    | text    | hex color                             |

### expenses

| Column        | Type    | Notes                                    |
| ------------- | ------- | ---------------------------------------- |
| id            | text    | PK, nanoid                               |
| group_id      | text    | FK → groups.id, not null                 |
| title         | text    | not null                                 |
| amount        | real    | total amount in expense currency         |
| currency      | text    | ISO 4217, defaults to group currency     |
| exchange_rate | real    | rate to group currency at time of expense |
| category_id   | text    | FK → categories.id, nullable            |
| note          | text    | nullable                                 |
| date          | integer | unix timestamp of when expense occurred  |
| split_method  | text    | 'equal' / 'percentage' / 'amount' / 'weight' / 'shares' |
| recurring_id  | text    | FK → recurring_expenses.id, nullable     |
| created_by    | text    | FK → group_members.id                    |
| created_at    | integer | unix timestamp                           |
| updated_at    | integer | unix timestamp                           |

### expense_payers

Who paid for this expense (supports multi-payer).

| Column     | Type | Notes                      |
| ---------- | ---- | -------------------------- |
| id         | text | PK                         |
| expense_id | text | FK → expenses.id           |
| member_id  | text | FK → group_members.id      |
| amount     | real | how much this person paid  |

### expense_splits

Who owes what portion of this expense.

| Column     | Type | Notes                                        |
| ---------- | ---- | -------------------------------------------- |
| id         | text | PK                                           |
| expense_id | text | FK → expenses.id                             |
| member_id  | text | FK → group_members.id                        |
| amount     | real | calculated owed amount                       |
| shares     | real | raw share/percentage/weight value (for audit) |

### expense_items

For item-level bill splitting.

| Column     | Type | Notes                   |
| ---------- | ---- | ----------------------- |
| id         | text | PK                      |
| expense_id | text | FK → expenses.id        |
| name       | text | item description        |
| amount     | real | item price              |

### expense_item_splits

Which members share each item.

| Column   | Type | Notes                      |
| -------- | ---- | -------------------------- |
| id       | text | PK                         |
| item_id  | text | FK → expense_items.id      |
| member_id| text | FK → group_members.id      |
| shares   | real | share count, default 1     |

### receipts

| Column     | Type    | Notes                          |
| ---------- | ------- | ------------------------------ |
| id         | text    | PK                             |
| expense_id | text    | FK → expenses.id               |
| file_path  | text    | relative path in uploads/      |
| mime_type  | text    | e.g. image/jpeg                |
| size       | integer | bytes                          |
| created_at | integer | unix timestamp                 |

### settlements

Record of payments between members to settle debts.

| Column     | Type    | Notes                      |
| ---------- | ------- | -------------------------- |
| id         | text    | PK, nanoid                 |
| group_id   | text    | FK → groups.id             |
| from_id    | text    | FK → group_members.id      |
| to_id      | text    | FK → group_members.id      |
| amount     | real    | amount paid                |
| currency   | text    | ISO 4217                   |
| note       | text    | nullable                   |
| date       | integer | unix timestamp             |
| created_by | text    | FK → group_members.id      |
| created_at | integer | unix timestamp             |

### recurring_expenses

Templates for recurring expense creation.

| Column       | Type    | Notes                                 |
| ------------ | ------- | ------------------------------------- |
| id           | text    | PK                                    |
| group_id     | text    | FK → groups.id                        |
| title        | text    | not null                              |
| amount       | real    | not null                              |
| currency     | text    | ISO 4217                              |
| category_id  | text    | FK → categories.id, nullable          |
| split_method | text    | same enum as expenses                 |
| frequency    | text    | 'daily' / 'weekly' / 'monthly' / 'yearly' |
| next_date    | integer | next scheduled creation               |
| active       | integer | boolean, default 1                    |
| template     | text    | JSON blob with payers/splits config   |
| created_by   | text    | FK → group_members.id                 |
| created_at   | integer | unix timestamp                        |

### activity_log

For notifications and history feed.

| Column     | Type    | Notes                              |
| ---------- | ------- | ---------------------------------- |
| id         | text    | PK                                 |
| group_id   | text    | FK → groups.id                     |
| actor_id   | text    | FK → group_members.id              |
| action     | text    | 'expense_created' / 'expense_updated' / 'settlement_created' / etc. |
| entity_type| text    | 'expense' / 'settlement' / 'group' |
| entity_id  | text    | FK to relevant table               |
| data       | text    | JSON with change details           |
| created_at | integer | unix timestamp                     |

## Indexes

- `users.email` — unique
- `groups.invite_code` — unique
- `group_members(group_id, user_id)` — composite unique (where user_id not null)
- `expenses.group_id` — for listing expenses in a group
- `expenses.date` — for date-range queries
- `expense_payers.expense_id`
- `expense_splits.expense_id`
- `expense_splits.member_id` — for per-member balance queries
- `settlements.group_id`
- `activity_log(group_id, created_at)` — for paginated feed
- `recurring_expenses(next_date, active)` — for cron processing

## Migrations

Use `drizzle-kit push` for development, `drizzle-kit generate` + `drizzle-kit migrate` for production.
