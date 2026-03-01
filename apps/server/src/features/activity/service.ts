import { db } from "../../lib/db"
import { activityLog } from "../../db/schema"
import { eq, desc, gte, and } from "drizzle-orm"
import { nanoid } from "nanoid"

export type ActivityAction =
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "settlement_created"
  | "settlement_deleted"
  | "member_joined"
  | "member_removed"
  | "group_updated"

export async function logActivity(
  groupId: string,
  actorId: string,
  action: ActivityAction,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>,
) {
  const id = nanoid()
  const now = Date.now()

  await db.insert(activityLog).values({
    id,
    groupId,
    actorId,
    action,
    entityType,
    entityId,
    data: data ? JSON.stringify(data) : null,
    createdAt: now,
  })

  return { id, groupId, actorId, action, entityType, entityId, data, createdAt: now }
}

export async function getActivity(
  groupId: string,
  options?: { page?: number; limit?: number; since?: number },
) {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const offset = (page - 1) * limit

  const conditions = [eq(activityLog.groupId, groupId)]
  if (options?.since) {
    conditions.push(gte(activityLog.createdAt, options.since))
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions)

  const rows = await db
    .select()
    .from(activityLog)
    .where(where!)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset)

  const activities = rows.map((row) => ({
    ...row,
    data: row.data ? JSON.parse(row.data) : null,
  }))

  return { activities }
}
