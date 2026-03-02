import { pgTable, text, bigint, doublePrecision, boolean, index } from "drizzle-orm/pg-core"
import { groups, groupMembers } from "./groups"

export const recurringExpenses = pgTable("recurring_expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  comment: text("comment"),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  splitMethod: text("split_method", { enum: ["equal", "percentage", "amount", "weight", "shares"] }).notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }).notNull(),
  nextDate: bigint("next_date", { mode: "number" }).notNull(),
  active: boolean("active").default(true).notNull(),
  template: text("template").notNull(),
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
  index("recurring_next_active_idx").on(table.nextDate, table.active),
])
