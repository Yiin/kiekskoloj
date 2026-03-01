import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core"

export const exchangeRates = sqliteTable("exchange_rates", {
  base: text("base").notNull(),
  target: text("target").notNull(),
  rate: real("rate").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.base, table.target] }),
])
