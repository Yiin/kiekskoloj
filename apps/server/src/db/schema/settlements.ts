import { pgTable, text, bigint, doublePrecision, index } from "drizzle-orm/pg-core"
import { groups, groupMembers } from "./groups"

export const settlements = pgTable("settlements", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  fromId: text("from_id").notNull().references(() => groupMembers.id),
  toId: text("to_id").notNull().references(() => groupMembers.id),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  note: text("note"),
  date: bigint("date", { mode: "number" }).notNull(),
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
  index("settlements_group_id_idx").on(table.groupId),
])
