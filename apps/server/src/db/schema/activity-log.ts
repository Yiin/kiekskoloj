import { pgTable, text, bigint, index } from "drizzle-orm/pg-core"
import { groups, groupMembers } from "./groups"

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => groupMembers.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  data: text("data"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [
  index("activity_log_group_created_idx").on(table.groupId, table.createdAt),
])
