import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core"
import { users } from "./users"

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").default("EUR").notNull(),
  color: text("color"),
  inviteCode: text("invite_code").unique(),
  archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  weight: real("weight").default(1.0).notNull(),
  role: text("role", { enum: ["admin", "member", "readonly"] }).default("member").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  joinedAt: integer("joined_at").notNull(),
}, (table) => [
  uniqueIndex("group_members_group_user_idx").on(table.groupId, table.userId),
])
