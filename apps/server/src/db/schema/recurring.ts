import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import { groups, groupMembers } from "./groups"
import { categories } from "./expenses"

export const recurringExpenses = sqliteTable("recurring_expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  categoryId: text("category_id").references(() => categories.id),
  splitMethod: text("split_method", { enum: ["equal", "percentage", "amount", "weight", "shares"] }).notNull(),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }).notNull(),
  nextDate: integer("next_date").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  template: text("template").notNull(), // JSON blob with payers/splits config
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("recurring_next_active_idx").on(table.nextDate, table.active),
])
