import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import { groups, groupMembers } from "./groups"

export const settlements = sqliteTable("settlements", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  fromId: text("from_id").notNull().references(() => groupMembers.id),
  toId: text("to_id").notNull().references(() => groupMembers.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  note: text("note"),
  date: integer("date").notNull(),
  createdBy: text("created_by").notNull().references(() => groupMembers.id),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("settlements_group_id_idx").on(table.groupId),
])
