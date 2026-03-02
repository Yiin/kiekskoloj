import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "./service"

const expenseBody = t.Object({
  title: t.String({ minLength: 1 }),
  amount: t.Number({ minimum: 0, exclusiveMinimum: 0 }),
  currency: t.String({ minLength: 1 }),
  date: t.Number(),
  splitMethod: t.Union([
    t.Literal("equal"),
    t.Literal("percentage"),
    t.Literal("amount"),
    t.Literal("weight"),
    t.Literal("shares"),
  ]),
  categoryId: t.Optional(t.String()),
  note: t.Optional(t.String()),
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
  items: t.Optional(t.Array(
    t.Object({
      name: t.String({ minLength: 1 }),
      amount: t.Number({ minimum: 0 }),
      splits: t.Array(
        t.Object({
          memberId: t.String(),
          shares: t.Optional(t.Number()),
        }),
        { minItems: 1 },
      ),
    }),
  )),
})

export const expenseRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .get("/:groupId/expenses", async ({ params, member, query, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const options = {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      from: query.from ? parseInt(query.from) : undefined,
      to: query.to ? parseInt(query.to) : undefined,
      categoryId: query.categoryId || undefined,
      memberId: query.memberId || undefined,
    }
    const result = await getExpenses(params.groupId, options)
    return result
  }, {
    requireAuth: true,
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
      categoryId: t.Optional(t.String()),
      memberId: t.Optional(t.String()),
    }),
  })

  .post("/:groupId/expenses", async ({ params, member, body, set, memberToken }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }

    // Validate payer amounts sum to expense amount
    const payerSum = Math.round(body.payers.reduce((s, p) => s + p.amount, 0) * 100) / 100
    if (Math.abs(payerSum - body.amount) > 0.01) {
      set.status = 400
      return {
        error: "VALIDATION_ERROR",
        message: `Payer amounts (${payerSum}) must sum to expense amount (${body.amount})`,
      }
    }

    // Validate split shares for percentage method
    if (body.splitMethod === "percentage") {
      const shareSum = body.splits.reduce((s, sp) => s + (sp.shares || 0), 0)
      if (Math.abs(shareSum - 100) > 0.01) {
        set.status = 400
        return {
          error: "VALIDATION_ERROR",
          message: `Percentage shares must sum to 100, got ${shareSum}`,
        }
      }
    }

    // Validate split amounts for amount method
    if (body.splitMethod === "amount") {
      const splitSum = Math.round(body.splits.reduce((s, sp) => s + (sp.amount || 0), 0) * 100) / 100
      if (Math.abs(splitSum - body.amount) > 0.01) {
        set.status = 400
        return {
          error: "VALIDATION_ERROR",
          message: `Split amounts (${splitSum}) must sum to expense amount (${body.amount})`,
        }
      }
    }

    const expense = await createExpense(params.groupId, member.id, body, memberToken!)
    return { expense }
  }, {
    requireAuth: true,
    body: expenseBody,
  })

  .get("/:groupId/expenses/:expenseId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const expense = await getExpenseById(params.expenseId)
    if (!expense) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Expense not found" }
    }
    return { expense }
  }, { requireAuth: true })

  .put("/:groupId/expenses/:expenseId", async ({ params, member, body, set, memberToken }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }

    const existing = await getExpenseById(params.expenseId)
    if (!existing) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Expense not found" }
    }

    // Validate payer amounts sum to expense amount
    const payerSum = Math.round(body.payers.reduce((s, p) => s + p.amount, 0) * 100) / 100
    if (Math.abs(payerSum - body.amount) > 0.01) {
      set.status = 400
      return {
        error: "VALIDATION_ERROR",
        message: `Payer amounts (${payerSum}) must sum to expense amount (${body.amount})`,
      }
    }

    // Validate split shares for percentage method
    if (body.splitMethod === "percentage") {
      const shareSum = body.splits.reduce((s, sp) => s + (sp.shares || 0), 0)
      if (Math.abs(shareSum - 100) > 0.01) {
        set.status = 400
        return {
          error: "VALIDATION_ERROR",
          message: `Percentage shares must sum to 100, got ${shareSum}`,
        }
      }
    }

    // Validate split amounts for amount method
    if (body.splitMethod === "amount") {
      const splitSum = Math.round(body.splits.reduce((s, sp) => s + (sp.amount || 0), 0) * 100) / 100
      if (Math.abs(splitSum - body.amount) > 0.01) {
        set.status = 400
        return {
          error: "VALIDATION_ERROR",
          message: `Split amounts (${splitSum}) must sum to expense amount (${body.amount})`,
        }
      }
    }

    const expense = await updateExpense(params.expenseId, body, params.groupId, member.id, memberToken!)
    return { expense }
  }, {
    requireAuth: true,
    body: expenseBody,
  })

  .delete("/:groupId/expenses/:expenseId", async ({ params, member, set, memberToken }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const existing = await getExpenseById(params.expenseId)
    if (!existing) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Expense not found" }
    }
    await deleteExpense(params.expenseId, params.groupId, member.id, memberToken!)
    set.status = 204
  }, { requireAuth: true })
