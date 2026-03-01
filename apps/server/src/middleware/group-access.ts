import { Elysia } from "elysia"
import { db } from "../lib/db"
import { groupMembers } from "../db/schema"
import { and, eq } from "drizzle-orm"
import { authGuard } from "./auth-guard"

export const groupAccess = new Elysia({ name: "group-access" })
  .use(authGuard)
  .derive({ as: "scoped" }, async ({ userId, params }) => {
    const groupId = (params as any)?.groupId
    if (!groupId || !userId) return { member: null as any }

    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId)
      ),
    })

    return { member: member || null }
  })
