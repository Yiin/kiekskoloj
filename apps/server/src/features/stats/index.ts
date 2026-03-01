import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import { getGroupStats } from "./service"

export const statsRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/stats", async ({ params, member, set, query }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const from = query.from ? parseInt(query.from) : undefined
    const to = query.to ? parseInt(query.to) : undefined
    const stats = await getGroupStats(params.groupId, from, to)
    return stats
  }, {
    requireAuth: true,
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  })
