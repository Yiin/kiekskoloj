import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from "../db/schema"

const dbPath = Bun.env.DATABASE_PATH || "./data/kiekskoloj.db"
const sqlite = new Database(dbPath)
sqlite.exec("PRAGMA journal_mode = WAL")
sqlite.exec("PRAGMA foreign_keys = ON")

// Auto-create tables if they don't exist
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, avatar_url TEXT, locale TEXT NOT NULL DEFAULT 'en',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR',
    color TEXT, invite_code TEXT UNIQUE, archived INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0, role TEXT NOT NULL DEFAULT 'member',
    active INTEGER NOT NULL DEFAULT 1, joined_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS group_members_group_user_idx ON group_members(group_id, user_id);
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL, icon TEXT, color TEXT
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL,
    exchange_rate REAL, category_id TEXT REFERENCES categories(id),
    note TEXT, date INTEGER NOT NULL, split_method TEXT NOT NULL,
    recurring_id TEXT, created_by TEXT NOT NULL REFERENCES group_members(id),
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS expenses_group_id_idx ON expenses(group_id);
  CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
  CREATE TABLE IF NOT EXISTS expense_payers (
    id TEXT PRIMARY KEY, expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES group_members(id), amount REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS expense_payers_expense_id_idx ON expense_payers(expense_id);
  CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY, expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES group_members(id), amount REAL NOT NULL, shares REAL
  );
  CREATE INDEX IF NOT EXISTS expense_splits_expense_id_idx ON expense_splits(expense_id);
  CREATE INDEX IF NOT EXISTS expense_splits_member_id_idx ON expense_splits(member_id);
  CREATE TABLE IF NOT EXISTS expense_items (
    id TEXT PRIMARY KEY, expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    name TEXT NOT NULL, amount REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS expense_item_splits (
    id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES group_members(id), shares REAL NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_id TEXT NOT NULL REFERENCES group_members(id),
    to_id TEXT NOT NULL REFERENCES group_members(id),
    amount REAL NOT NULL, currency TEXT NOT NULL, note TEXT,
    date INTEGER NOT NULL, created_by TEXT NOT NULL REFERENCES group_members(id),
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS settlements_group_id_idx ON settlements(group_id);
  CREATE TABLE IF NOT EXISTS exchange_rates (
    base TEXT NOT NULL, target TEXT NOT NULL, rate REAL NOT NULL,
    fetched_at INTEGER NOT NULL, PRIMARY KEY (base, target)
  );
  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY, expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES group_members(id),
    action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
    data TEXT, created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS activity_log_group_created_idx ON activity_log(group_id, created_at);
  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id), split_method TEXT NOT NULL,
    frequency TEXT NOT NULL, next_date INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1, template TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES group_members(id), created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS recurring_next_active_idx ON recurring_expenses(next_date, active);
`

for (const stmt of createTableSQL.split(";")) {
  const trimmed = stmt.trim()
  if (trimmed) sqlite.exec(trimmed)
}

export let db = drizzle(sqlite, { schema })
export type DB = typeof db

/** Replace the active db instance. Only for use in tests. */
export function _setDb(newDb: DB) {
  db = newDb
}
