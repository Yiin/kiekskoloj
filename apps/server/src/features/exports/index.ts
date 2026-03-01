import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import { exportCSV, exportJSON } from "./service"

export const exportRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/export/csv", async ({ params, member, set, query }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const from = query.from ? parseInt(query.from) : undefined
    const to = query.to ? parseInt(query.to) : undefined
    const csv = await exportCSV(params.groupId, from, to)

    set.headers["content-type"] = "text/csv; charset=utf-8"
    set.headers["content-disposition"] = `attachment; filename="expenses-${params.groupId}.csv"`
    return csv
  }, {
    requireAuth: true,
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  })

  .get("/:groupId/export/json", async ({ params, member, set, query }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const from = query.from ? parseInt(query.from) : undefined
    const to = query.to ? parseInt(query.to) : undefined
    const data = await exportJSON(params.groupId, from, to)

    set.headers["content-type"] = "application/json; charset=utf-8"
    set.headers["content-disposition"] = `attachment; filename="expenses-${params.groupId}.json"`
    return data
  }, {
    requireAuth: true,
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  })
