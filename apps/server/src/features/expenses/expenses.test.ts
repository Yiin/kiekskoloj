import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "."

let cleanup: () => Promise<void>

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(groupRoutes)
    .use(expenseRoutes)
}

async function req(
  app: ReturnType<typeof buildApp>,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  }
  if (body) init.body = JSON.stringify(body)
  return app.handle(new Request(`http://localhost${path}`, init))
}

function getSessionCookie(res: Response): string | null {
  const setCookie = res.headers.getSetCookie?.()
  if (!setCookie) return null
  for (const c of setCookie) {
    if (c.startsWith("session=")) return c
  }
  return null
}

function cookieValue(setCookie: string): string {
  return setCookie.split(";")[0]
}

describe("Expenses & Splits", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let memberId: string
  let member2Id: string
  let member3Id: string
  let outsiderCookie: string

  beforeAll(async () => {
    const ctx = await setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Create group (this also creates the first member and sets session cookie)
    const groupRes = await req(app, "POST", "/api/groups", {
      name: "Expense Test Group",
      memberName: "Expense User",
      currency: "EUR",
    })
    const sessionCookie = getSessionCookie(groupRes)
    userCookie = cookieValue(sessionCookie!)
    const groupBody = (await groupRes.json()) as any
    groupId = groupBody.group.id
    memberId = groupBody.group.members[0].id

    // Add two more offline members
    const m2Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Member Two",
    }, { Cookie: userCookie })
    const m2Body = (await m2Res.json()) as any
    member2Id = m2Body.member.id

    const m3Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Member Three",
    }, { Cookie: userCookie })
    const m3Body = (await m3Res.json()) as any
    member3Id = m3Body.member.id

    // Create an outsider session (different group, different token)
    const outsiderRes = await req(app, "POST", "/api/groups", {
      name: "Outsider Group",
      memberName: "Outsider",
    })
    const outsiderSessionCookie = getSessionCookie(outsiderRes)
    outsiderCookie = cookieValue(outsiderSessionCookie!)
  })

  afterAll(async () => {
    await cleanup()
  })

  test("Create expense with equal split", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Dinner",
      amount: 90,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 90 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense).toBeDefined()
    expect(body.expense.comment).toBe("Dinner")
    expect(body.expense.amount).toBe(90)
    expect(body.expense.payers).toHaveLength(1)
    expect(body.expense.payers[0].amount).toBe(90)
    expect(body.expense.splits).toHaveLength(3)
    for (const split of body.expense.splits) {
      expect(split.amount).toBe(30)
    }
  })

  test("Create expense with percentage split", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Hotel",
      amount: 200,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "percentage",
      payers: [{ memberId, amount: 200 }],
      splits: [
        { memberId, shares: 50 },
        { memberId: member2Id, shares: 30 },
        { memberId: member3Id, shares: 20 },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.splits).toHaveLength(3)

    const splitMap = new Map(body.expense.splits.map((s: any) => [s.memberId, s]))
    expect(splitMap.get(memberId).amount).toBe(100)
    expect(splitMap.get(member2Id).amount).toBe(60)
    expect(splitMap.get(member3Id).amount).toBe(40)
  })

  test("Create expense with exact amount split", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Groceries",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "amount",
      payers: [{ memberId, amount: 100 }],
      splits: [
        { memberId, amount: 50 },
        { memberId: member2Id, amount: 30 },
        { memberId: member3Id, amount: 20 },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.splits).toHaveLength(3)

    const splitMap = new Map(body.expense.splits.map((s: any) => [s.memberId, s]))
    expect(splitMap.get(memberId).amount).toBe(50)
    expect(splitMap.get(member2Id).amount).toBe(30)
    expect(splitMap.get(member3Id).amount).toBe(20)
  })

  test("Create expense with weight/shares split", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Taxi",
      amount: 60,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "shares",
      payers: [{ memberId, amount: 60 }],
      splits: [
        { memberId, shares: 3 },
        { memberId: member2Id, shares: 2 },
        { memberId: member3Id, shares: 1 },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.splits).toHaveLength(3)

    const splitMap = new Map(body.expense.splits.map((s: any) => [s.memberId, s]))
    expect(splitMap.get(memberId).amount).toBe(30)
    expect(splitMap.get(member2Id).amount).toBe(20)
    expect(splitMap.get(member3Id).amount).toBe(10)
  })

  test("Create expense with multi-payer", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Concert tickets",
      amount: 150,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [
        { memberId, amount: 100 },
        { memberId: member2Id, amount: 50 },
      ],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.payers).toHaveLength(2)
    expect(body.expense.splits).toHaveLength(3)

    const payerMap = new Map(body.expense.payers.map((p: any) => [p.memberId, p]))
    expect(payerMap.get(memberId).amount).toBe(100)
    expect(payerMap.get(member2Id).amount).toBe(50)

    for (const split of body.expense.splits) {
      expect(split.amount).toBe(50)
    }
  })

  test("List expenses with pagination", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/expenses?page=1&limit=2`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expenses).toHaveLength(2)
    expect(body.pagination).toBeDefined()
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(2)
    expect(body.pagination.total).toBeGreaterThanOrEqual(5)
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(3)

    for (const expense of body.expenses) {
      expect(expense.payers).toBeDefined()
      expect(expense.payers.length).toBeGreaterThanOrEqual(1)
    }
  })

  test("Get expense by ID returns full details", async () => {
    const createRes = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Detail Test",
      amount: 30,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 30 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    const createBody = (await createRes.json()) as any
    const expenseId = createBody.expense.id

    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/expenses/${expenseId}`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.id).toBe(expenseId)
    expect(body.expense.comment).toBe("Detail Test")
    expect(body.expense.payers).toHaveLength(1)
    expect(body.expense.splits).toHaveLength(3)
    expect(body.expense.items).toBeDefined()
  })

  test("Update expense changes comment and recalculates splits", async () => {
    const createRes = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Original Comment",
      amount: 90,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 90 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })
    const createBody = (await createRes.json()) as any
    const expenseId = createBody.expense.id

    const res = await req(app, "PUT", `/api/groups/${groupId}/expenses/${expenseId}`, {
      comment: "Updated Comment",
      amount: 200,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "percentage",
      payers: [{ memberId, amount: 200 }],
      splits: [
        { memberId, shares: 50 },
        { memberId: member2Id, shares: 25 },
        { memberId: member3Id, shares: 25 },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.comment).toBe("Updated Comment")
    expect(body.expense.amount).toBe(200)
    expect(body.expense.splitMethod).toBe("percentage")
    expect(body.expense.splits).toHaveLength(3)

    const splitMap = new Map(body.expense.splits.map((s: any) => [s.memberId, s]))
    expect(splitMap.get(memberId).amount).toBe(100)
    expect(splitMap.get(member2Id).amount).toBe(50)
    expect(splitMap.get(member3Id).amount).toBe(50)
  })

  test("Delete expense", async () => {
    const createRes = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "To Be Deleted",
      amount: 10,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 10 }],
      splits: [{ memberId }],
    }, { Cookie: userCookie })
    const createBody = (await createRes.json()) as any
    const expenseId = createBody.expense.id

    const res = await req(
      app,
      "DELETE",
      `/api/groups/${groupId}/expenses/${expenseId}`,
      undefined,
      { Cookie: userCookie },
    )
    expect(res.status).toBe(204)

    const getRes = await req(
      app,
      "GET",
      `/api/groups/${groupId}/expenses/${expenseId}`,
      undefined,
      { Cookie: userCookie },
    )
    expect(getRes.status).toBe(404)
  })

  test("Payer amounts must sum to expense amount (validation)", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Bad Payers",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 50 }],
      splits: [{ memberId }, { memberId: member2Id }],
    }, { Cookie: userCookie })

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe("VALIDATION_ERROR")
    expect(body.message).toContain("Payer amounts")
  })

  test("Split shares must sum correctly for percentage split", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Bad Percentage",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "percentage",
      payers: [{ memberId, amount: 100 }],
      splits: [
        { memberId, shares: 50 },
        { memberId: member2Id, shares: 30 },
      ],
    }, { Cookie: userCookie })

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe("VALIDATION_ERROR")
    expect(body.message).toContain("100")
  })

  test("Non-member cannot create expense (403)", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Unauthorized Expense",
      amount: 50,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 50 }],
      splits: [{ memberId }],
    }, { Cookie: outsiderCookie })

    expect(res.status).toBe(403)
  })
})
