import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import { getActivity } from "./service"

export const activityRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/activity", async ({ params, member, query, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const options = {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      since: query.since ? parseInt(query.since) : undefined,
    }
    const result = await getActivity(params.groupId, options)
    return result
  }, {
    requireAuth: true,
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      since: t.Optional(t.String()),
    }),
  })
