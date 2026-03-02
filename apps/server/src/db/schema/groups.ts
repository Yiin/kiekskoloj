import { pgTable, text, bigint, boolean, doublePrecision, uniqueIndex, index } from "drizzle-orm/pg-core"

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").default("EUR").notNull(),
  color: text("color"),
  inviteCode: text("invite_code").unique(),
  archived: boolean("archived").default(false).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
})

export const groupMembers = pgTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  token: text("token"),
  weight: doublePrecision("weight").default(1.0).notNull(),
  active: boolean("active").default(true).notNull(),
  joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
}, (table) => [
  uniqueIndex("group_members_group_name_idx").on(table.groupId, table.name),
  index("group_members_token_idx").on(table.token),
])
