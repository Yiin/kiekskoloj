import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  createRecurring,
  getRecurring,
  updateRecurring,
  deleteRecurring,
} from "./service"

const templateSchema = t.Object({
  payers: t.Array(
    t.Object({
      memberId: t.String(),
      amount: t.Number(),
    }),
    { minItems: 1 },
  ),
  splits: t.Array(
    t.Object({
      memberId: t.String(),
      amount: t.Optional(t.Number()),
      shares: t.Optional(t.Number()),
    }),
    { minItems: 1 },
  ),
})

const createBody = t.Object({
  comment: t.Optional(t.String()),
  amount: t.Number({ minimum: 0, exclusiveMinimum: 0 }),
  currency: t.String({ minLength: 1 }),
  splitMethod: t.Union([
    t.Literal("equal"),
    t.Literal("percentage"),
    t.Literal("amount"),
    t.Literal("weight"),
    t.Literal("shares"),
  ]),
  frequency: t.Union([
    t.Literal("daily"),
    t.Literal("weekly"),
    t.Literal("monthly"),
    t.Literal("yearly"),
  ]),
  nextDate: t.Number(),
  template: templateSchema,
})

const updateBody = t.Object({
  comment: t.Optional(t.Union([t.String(), t.Null()])),
  amount: t.Optional(t.Number({ minimum: 0, exclusiveMinimum: 0 })),
  currency: t.Optional(t.String({ minLength: 1 })),
  splitMethod: t.Optional(t.Union([
    t.Literal("equal"),
    t.Literal("percentage"),
    t.Literal("amount"),
    t.Literal("weight"),
    t.Literal("shares"),
  ])),
  frequency: t.Optional(t.Union([
    t.Literal("daily"),
    t.Literal("weekly"),
    t.Literal("monthly"),
    t.Literal("yearly"),
  ])),
  nextDate: t.Optional(t.Number()),
  active: t.Optional(t.Boolean()),
  template: t.Optional(templateSchema),
})

export const recurringRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/recurring", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const items = await getRecurring(params.groupId)
    return { recurring: items }
  }, { requireAuth: true })

  .post("/:groupId/recurring", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const item = await createRecurring(params.groupId, member.id, body)
    return { recurring: item }
  }, {
    requireAuth: true,
    body: createBody,
  })

  .put("/:groupId/recurring/:recurringId", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const item = await updateRecurring(params.recurringId, body)
    if (!item) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Recurring expense not found" }
    }
    return { recurring: item }
  }, {
    requireAuth: true,
    body: updateBody,
  })

  .delete("/:groupId/recurring/:recurringId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    await deleteRecurring(params.recurringId)
    set.status = 204
  }, { requireAuth: true })
