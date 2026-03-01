import { Elysia } from "elysia"
import { jwtPlugin } from "../../lib/auth"
import { wsManager } from "../../lib/ws"
import { db } from "../../lib/db"
import { groupMembers } from "../../db/schema"
import { and, eq } from "drizzle-orm"

export const wsRoutes = new Elysia()
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, cookie: { auth } }) => {
    if (!auth?.value) return { wsUserId: null as string | null }
    const payload = await jwt.verify(auth.value)
    if (!payload || !payload.sub) return { wsUserId: null as string | null }
    return { wsUserId: payload.sub as string }
  })
  .ws("/ws", {
    open(ws) {
      const userId = (ws.data as any).wsUserId
      if (!userId) {
        ws.close(4001, "Unauthorized")
        return
      }
      wsManager.addConnection(userId, ws)
    },

    async message(ws, raw) {
      const userId = (ws.data as any).wsUserId
      if (!userId) return

      const msg = typeof raw === "string" ? JSON.parse(raw) : raw as any

      switch (msg.type) {
        case "subscribe": {
          if (!msg.groupId) return
          // Verify user is a member of the group
          const member = await db.query.groupMembers.findFirst({
            where: and(
              eq(groupMembers.groupId, msg.groupId),
              eq(groupMembers.userId, userId),
            ),
          })
          if (member) {
            wsManager.subscribe(userId, msg.groupId)
            ws.send(JSON.stringify({ type: "subscribed", groupId: msg.groupId }))
          } else {
            ws.send(JSON.stringify({ type: "error", message: "Not a member of this group" }))
          }
          break
        }

        case "unsubscribe": {
          if (!msg.groupId) return
          wsManager.unsubscribe(userId, msg.groupId)
          ws.send(JSON.stringify({ type: "unsubscribed", groupId: msg.groupId }))
          break
        }

        case "ping": {
          ws.send(JSON.stringify({ type: "pong" }))
          break
        }
      }
    },

    close(ws) {
      const userId = (ws.data as any).wsUserId
      if (userId) {
        wsManager.removeConnection(userId, ws)
      }
    },
  })
