import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  createSettlement,
  getSettlements,
  deleteSettlement,
  getGroupBalances,
} from "./service"

export const settlementRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/settlements", async ({ params, member, set, query }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const limit = query.limit ? parseInt(query.limit) : undefined
    const offset = query.offset ? parseInt(query.offset) : undefined
    const rows = await getSettlements(params.groupId, { limit, offset })
    return { settlements: rows }
  }, {
    requireAuth: true,
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  })

  .post("/:groupId/settlements", async ({ params, member, body, set, userId }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const settlement = await createSettlement(params.groupId, member.id, body, userId!)
    return { settlement }
  }, {
    requireAuth: true,
    body: t.Object({
      fromId: t.String(),
      toId: t.String(),
      amount: t.Number({ minimum: 0.01 }),
      currency: t.String(),
      date: t.Number(),
      note: t.Optional(t.String()),
    }),
  })

  .delete("/:groupId/settlements/:settlementId", async ({ params, member, set, userId }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    await deleteSettlement(params.settlementId, params.groupId, member.id, userId!)
    set.status = 204
  }, { requireAuth: true })

  .get("/:groupId/balances", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const result = await getGroupBalances(params.groupId)
    return result
  }, { requireAuth: true })
