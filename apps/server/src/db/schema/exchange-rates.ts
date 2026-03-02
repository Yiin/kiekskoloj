import { pgTable, text, doublePrecision, bigint, primaryKey } from "drizzle-orm/pg-core"

export const exchangeRates = pgTable("exchange_rates", {
  base: text("base").notNull(),
  target: text("target").notNull(),
  rate: doublePrecision("rate").notNull(),
  fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.base, table.target] }),
])
