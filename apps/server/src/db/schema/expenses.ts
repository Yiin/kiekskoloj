import { pgTable, text, bigint, doublePrecision, index } from "drizzle-orm/pg-core"
import { groups, groupMembers } from "./groups"

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
})

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  exchangeRate: doublePrecision("exchange_rate"),
  categoryId: text("category_id").references(() => categories.id),
  note: text("note"),
  date: bigint("date", { mode: "number" }).notNull(),
  splitMethod: text("split_method", { enum: ["equal", "percentage", "amount", "weight", "shares"] }).notNull(),
  recurringId: text("recurring_id"),
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  index("expenses_group_id_idx").on(table.groupId),
  index("expenses_date_idx").on(table.date),
])

export const expensePayers = pgTable("expense_payers", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  amount: doublePrecision("amount").notNull(),
}, (table) => [
  index("expense_payers_expense_id_idx").on(table.expenseId),
])

export const expenseSplits = pgTable("expense_splits", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  amount: doublePrecision("amount").notNull(),
  shares: doublePrecision("shares"),
}, (table) => [
  index("expense_splits_expense_id_idx").on(table.expenseId),
  index("expense_splits_member_id_idx").on(table.memberId),
])

export const expenseItems = pgTable("expense_items", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: doublePrecision("amount").notNull(),
})

export const expenseItemSplits = pgTable("expense_item_splits", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => expenseItems.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => groupMembers.id),
  shares: doublePrecision("shares").default(1).notNull(),
})
