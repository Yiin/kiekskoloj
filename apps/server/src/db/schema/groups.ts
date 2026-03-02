import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core"

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").default("EUR").notNull(),
  color: text("color"),
  inviteCode: text("invite_code").unique(),
  archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token"),
  weight: real("weight").default(1.0).notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  joinedAt: integer("joined_at").notNull(),
}, (table) => [
  uniqueIndex("group_members_group_name_idx").on(table.groupId, table.name),
  index("group_members_token_idx").on(table.token),
])
