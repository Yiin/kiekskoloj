import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import { groups, groupMembers } from "./groups"

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
})

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  exchangeRate: real("exchange_rate"),
  categoryId: text("category_id").references(() => categories.id),
  note: text("note"),
  date: integer("date").notNull(),
  splitMethod: text("split_method", { enum: ["equal", "percentage", "amount", "weight", "shares"] }).notNull(),
  recurringId: text("recurring_id"),
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("expenses_group_id_idx").on(table.groupId),
  index("expenses_date_idx").on(table.date),
])

export const expensePayers = sqliteTable("expense_payers", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  amount: real("amount").notNull(),
}, (table) => [
  index("expense_payers_expense_id_idx").on(table.expenseId),
])

export const expenseSplits = sqliteTable("expense_splits", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  amount: real("amount").notNull(),
  shares: real("shares"),
}, (table) => [
  index("expense_splits_expense_id_idx").on(table.expenseId),
  index("expense_splits_member_id_idx").on(table.memberId),
])

export const expenseItems = sqliteTable("expense_items", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
})

export const expenseItemSplits = sqliteTable("expense_item_splits", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => expenseItems.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  shares: real("shares").default(1).notNull(),
})
