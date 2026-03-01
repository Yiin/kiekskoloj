import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./service"

export const categoryRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/categories", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const cats = await getCategories(params.groupId)
    return { categories: cats }
  }, { requireAuth: true })

  .post("/:groupId/categories", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const category = await createCategory(params.groupId, body)
    return { category }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
      icon: t.Optional(t.String()),
      color: t.Optional(t.String()),
    }),
  })

  .put("/:groupId/categories/:categoryId", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const category = await updateCategory(params.categoryId, body)
    if (!category) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Category not found" }
    }
    return { category }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      icon: t.Optional(t.String()),
      color: t.Optional(t.String()),
    }),
  })

  .delete("/:groupId/categories/:categoryId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    await deleteCategory(params.categoryId)
    set.status = 204
  }, { requireAuth: true })
