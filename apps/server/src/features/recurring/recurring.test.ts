import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { authRoutes } from "../auth"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "../expenses"
import { recurringRoutes } from "."
import { getNextDate, processDueRecurring } from "./service"
import { db } from "../../lib/db"
import { expenses } from "../../db/schema"
import { eq } from "drizzle-orm"

let cleanup: () => void

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .use(groupRoutes)
    .use(expenseRoutes)
    .use(recurringRoutes)
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

function getAuthCookie(res: Response): string | null {
  const setCookie = res.headers.getSetCookie?.()
  if (!setCookie) return null
  for (const c of setCookie) {
    if (c.startsWith("auth=")) return c
  }
  return null
}

function cookieValue(setCookie: string): string {
  return setCookie.split(";")[0]
}

async function registerUser(
  app: ReturnType<typeof buildApp>,
  email: string,
  name: string,
) {
  const res = await req(app, "POST", "/api/auth/register", {
    email,
    name,
    password: "testpassword123",
  })
  const cookie = getAuthCookie(res)
  const body = (await res.json()) as any
  return { cookie: cookieValue(cookie!), user: body.user }
}

describe("Recurring Expenses", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let memberId: string
  let member2Id: string
  let recurringId: string

  beforeAll(async () => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Register user and create a group
    const user = await registerUser(app, "recurring-user@test.com", "Recurring User")
    userCookie = user.cookie

    // Create group
    const groupRes = await req(app, "POST", "/api/groups", {
      name: "Recurring Test Group",
      currency: "EUR",
    }, { Cookie: userCookie })
    const groupBody = (await groupRes.json()) as any
    groupId = groupBody.group.id
    memberId = groupBody.group.members[0].id

    // Add an offline member
    const m2Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Member Two",
    }, { Cookie: userCookie })
    const m2Body = (await m2Res.json()) as any
    member2Id = m2Body.member.id
  })

  afterAll(() => {
    cleanup()
  })

  test("Create a recurring expense", async () => {
    const nextDate = Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week from now
    const res = await req(app, "POST", `/api/groups/${groupId}/recurring`, {
      title: "Monthly Rent",
      amount: 1000,
      currency: "EUR",
      splitMethod: "equal",
      frequency: "monthly",
      nextDate,
      template: {
        payers: [{ memberId, amount: 1000 }],
        splits: [{ memberId }, { memberId: member2Id }],
        note: "Rent payment",
      },
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.recurring).toBeDefined()
    expect(body.recurring.title).toBe("Monthly Rent")
    expect(body.recurring.amount).toBe(1000)
    expect(body.recurring.frequency).toBe("monthly")
    expect(body.recurring.active).toBe(true)
    expect(body.recurring.nextDate).toBe(nextDate)

    recurringId = body.recurring.id
  })

  test("List recurring expenses", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/recurring`, undefined, {
      Cookie: userCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.recurring).toBeDefined()
    expect(body.recurring.length).toBeGreaterThanOrEqual(1)
    expect(body.recurring.some((r: any) => r.id === recurringId)).toBe(true)
  })

  test("Update recurring expense (change frequency, deactivate)", async () => {
    // Change frequency to weekly
    const res1 = await req(app, "PUT", `/api/groups/${groupId}/recurring/${recurringId}`, {
      frequency: "weekly",
    }, { Cookie: userCookie })

    expect(res1.status).toBe(200)
    const body1 = (await res1.json()) as any
    expect(body1.recurring.frequency).toBe("weekly")
    expect(body1.recurring.active).toBe(true)

    // Deactivate
    const res2 = await req(app, "PUT", `/api/groups/${groupId}/recurring/${recurringId}`, {
      active: false,
    }, { Cookie: userCookie })

    expect(res2.status).toBe(200)
    const body2 = (await res2.json()) as any
    expect(body2.recurring.active).toBe(false)

    // Re-activate for later tests
    await req(app, "PUT", `/api/groups/${groupId}/recurring/${recurringId}`, {
      active: true,
    }, { Cookie: userCookie })
  })

  test("Delete recurring expense", async () => {
    // Create a temporary one to delete
    const createRes = await req(app, "POST", `/api/groups/${groupId}/recurring`, {
      title: "To Delete",
      amount: 50,
      currency: "EUR",
      splitMethod: "equal",
      frequency: "daily",
      nextDate: Date.now() + 86400000,
      template: {
        payers: [{ memberId, amount: 50 }],
        splits: [{ memberId }],
      },
    }, { Cookie: userCookie })
    const createBody = (await createRes.json()) as any
    const tempId = createBody.recurring.id

    const res = await req(app, "DELETE", `/api/groups/${groupId}/recurring/${tempId}`, undefined, {
      Cookie: userCookie,
    })
    expect(res.status).toBe(204)

    // Verify it's gone from listing
    const listRes = await req(app, "GET", `/api/groups/${groupId}/recurring`, undefined, {
      Cookie: userCookie,
    })
    const listBody = (await listRes.json()) as any
    expect(listBody.recurring.some((r: any) => r.id === tempId)).toBe(false)
  })

  test("Process due recurring expenses creates expense", async () => {
    // Update nextDate to the past so it's due
    const pastDate = Date.now() - 60000 // 1 minute ago
    await req(app, "PUT", `/api/groups/${groupId}/recurring/${recurringId}`, {
      nextDate: pastDate,
      frequency: "monthly",
    }, { Cookie: userCookie })

    // Process due recurring expenses
    const processed = await processDueRecurring()
    expect(processed).toBeGreaterThanOrEqual(1)

    // Verify an expense was created
    const expenseList = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))

    const createdExpense = expenseList.find((e) => e.title === "Monthly Rent")
    expect(createdExpense).toBeDefined()
    expect(createdExpense!.amount).toBe(1000)
    expect(createdExpense!.currency).toBe("EUR")

    // Verify nextDate was advanced
    const listRes = await req(app, "GET", `/api/groups/${groupId}/recurring`, undefined, {
      Cookie: userCookie,
    })
    const listBody = (await listRes.json()) as any
    const updated = listBody.recurring.find((r: any) => r.id === recurringId)
    expect(updated.nextDate).toBeGreaterThan(pastDate)
  })

  test("Next date calculation is correct for daily/weekly/monthly/yearly", () => {
    // Use a fixed date: 2025-06-15T12:00:00.000Z
    const base = new Date("2025-06-15T12:00:00.000Z").getTime()

    // Daily: next day
    const daily = getNextDate(base, "daily")
    const dailyDate = new Date(daily)
    expect(dailyDate.getUTCDate()).toBe(16)
    expect(dailyDate.getUTCMonth()).toBe(5) // June (0-indexed)

    // Weekly: +7 days
    const weekly = getNextDate(base, "weekly")
    const weeklyDate = new Date(weekly)
    expect(weeklyDate.getUTCDate()).toBe(22)
    expect(weeklyDate.getUTCMonth()).toBe(5)

    // Monthly: next month same day
    const monthly = getNextDate(base, "monthly")
    const monthlyDate = new Date(monthly)
    expect(monthlyDate.getUTCDate()).toBe(15)
    expect(monthlyDate.getUTCMonth()).toBe(6) // July

    // Yearly: next year same month/day
    const yearly = getNextDate(base, "yearly")
    const yearlyDate = new Date(yearly)
    expect(yearlyDate.getUTCDate()).toBe(15)
    expect(yearlyDate.getUTCMonth()).toBe(5)
    expect(yearlyDate.getUTCFullYear()).toBe(2026)
  })

  test("Inactive recurring expenses are not processed", async () => {
    // Create a new recurring expense that's due but inactive
    const pastDate = Date.now() - 60000
    const createRes = await req(app, "POST", `/api/groups/${groupId}/recurring`, {
      title: "Inactive Subscription",
      amount: 25,
      currency: "EUR",
      splitMethod: "equal",
      frequency: "monthly",
      nextDate: pastDate,
      template: {
        payers: [{ memberId, amount: 25 }],
        splits: [{ memberId }],
      },
    }, { Cookie: userCookie })
    const createBody = (await createRes.json()) as any
    const inactiveId = createBody.recurring.id

    // Deactivate it
    await req(app, "PUT", `/api/groups/${groupId}/recurring/${inactiveId}`, {
      active: false,
    }, { Cookie: userCookie })

    // Count expenses before processing
    const beforeExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
    const countBefore = beforeExpenses.length

    // Process - inactive should be skipped
    await processDueRecurring()

    // Count expenses after processing
    const afterExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))

    // No new "Inactive Subscription" expense should exist
    const inactiveExpenses = afterExpenses.filter((e) => e.title === "Inactive Subscription")
    expect(inactiveExpenses).toHaveLength(0)
  })
})
