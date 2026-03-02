import { Elysia } from "elysia"
import { wsManager } from "../../lib/ws"
import { db } from "../../lib/db"
import { groupMembers } from "../../db/schema"
import { and, eq } from "drizzle-orm"

export const wsRoutes = new Elysia()
  .derive({ as: "scoped" }, ({ cookie: { session } }) => {
    return { wsToken: (session?.value as string) || null }
  })
  .ws("/ws", {
    open(ws) {
      const token = (ws.data as any).wsToken
      if (!token) {
        ws.close(4001, "Unauthorized")
        return
      }
      wsManager.addConnection(token, ws)
    },

    async message(ws, raw) {
      const token = (ws.data as any).wsToken
      if (!token) return

      const msg = typeof raw === "string" ? JSON.parse(raw) : raw as any

      switch (msg.type) {
        case "subscribe": {
          if (!msg.groupId) return
          const member = await db.query.groupMembers.findFirst({
            where: and(
              eq(groupMembers.groupId, msg.groupId),
              eq(groupMembers.token, token),
            ),
          })
          if (member) {
            wsManager.subscribe(token, msg.groupId)
            ws.send(JSON.stringify({ type: "subscribed", groupId: msg.groupId }))
          } else {
            ws.send(JSON.stringify({ type: "error", message: "Not a member of this group" }))
          }
          break
        }

        case "unsubscribe": {
          if (!msg.groupId) return
          wsManager.unsubscribe(token, msg.groupId)
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
      const token = (ws.data as any).wsToken
      if (token) {
        wsManager.removeConnection(token, ws)
      }
    },
  })
