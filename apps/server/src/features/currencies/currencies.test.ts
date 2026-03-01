import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { authRoutes } from "../auth"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "../expenses"
import { settlementRoutes } from "../settlements"
import { currencyRoutes } from "."
import { db } from "../../lib/db"
import { exchangeRates, expenses, expensePayers, expenseSplits } from "../../db/schema"
import { nanoid } from "nanoid"
import { eq, and } from "drizzle-orm"

let cleanup: () => void

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .use(groupRoutes)
    .use(expenseRoutes)
    .use(settlementRoutes)
    .use(currencyRoutes)
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

describe("Currencies", () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(() => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()
  })

  afterAll(() => {
    cleanup()
  })

  test("GET /currencies returns list of currencies", async () => {
    const res = await req(app, "GET", "/api/currencies")
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.currencies).toBeDefined()
    expect(Array.isArray(body.currencies)).toBe(true)
    expect(body.currencies.length).toBeGreaterThan(0)

    // Each currency should have code, name, symbol
    const eur = body.currencies.find((c: any) => c.code === "EUR")
    expect(eur).toBeDefined()
    expect(eur.name).toBe("Euro")
    expect(eur.symbol).toBe("\u20ac")
  })

  test("GET /currencies/rates returns exchange rates from cache", async () => {
    // Seed some cached rates
    const now = Date.now()
    await db.insert(exchangeRates).values([
      { base: "EUR", target: "USD", rate: 1.08, fetchedAt: now },
      { base: "EUR", target: "GBP", rate: 0.86, fetchedAt: now },
      { base: "EUR", target: "JPY", rate: 162.5, fetchedAt: now },
    ])

    const res = await req(app, "GET", "/api/currencies/rates?base=EUR")
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.base).toBe("EUR")
    expect(body.rates).toBeDefined()
    expect(body.rates.USD).toBe(1.08)
    expect(body.rates.GBP).toBe(0.86)
  })

  test("GET /currencies/rates with symbols filter", async () => {
    const res = await req(app, "GET", "/api/currencies/rates?base=EUR&symbols=USD,GBP")
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.rates.USD).toBe(1.08)
    expect(body.rates.GBP).toBe(0.86)
    expect(body.rates.JPY).toBeUndefined()
  })
})

describe("Multi-currency expenses", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let memberId: string
  let member2Id: string

  beforeAll(async () => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Seed exchange rates so we don't need external API
    const now = Date.now()
    await db.insert(exchangeRates).values([
      { base: "USD", target: "EUR", rate: 0.92, fetchedAt: now },
      { base: "GBP", target: "EUR", rate: 1.17, fetchedAt: now },
    ])

    // Register user
    const user = await registerUser(app, "multicurrency@test.com", "Currency User")
    userCookie = user.cookie

    // Create group with EUR as default currency
    const groupRes = await req(app, "POST", "/api/groups", {
      name: "Multi-Currency Group",
      currency: "EUR",
    }, { Cookie: userCookie })
    const groupBody = (await groupRes.json()) as any
    groupId = groupBody.group.id
    memberId = groupBody.group.members[0].id

    // Add a second member
    const m2Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Member Two",
    }, { Cookie: userCookie })
    const m2Body = (await m2Res.json()) as any
    member2Id = m2Body.member.id
  })

  afterAll(() => {
    cleanup()
  })

  test("Creating expense in group currency stores null exchangeRate", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      title: "EUR Expense",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 100 }],
      splits: [{ memberId }, { memberId: member2Id }],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.exchangeRate).toBeNull()
    expect(body.expense.currency).toBe("EUR")
  })

  test("Creating expense in USD stores exchangeRate to group currency (EUR)", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      title: "USD Expense",
      amount: 50,
      currency: "USD",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 50 }],
      splits: [{ memberId }, { memberId: member2Id }],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.currency).toBe("USD")
    expect(body.expense.exchangeRate).toBe(0.92)
  })

  test("Balance computation converts multi-currency expenses to group currency", async () => {
    // Start fresh: create new group + members + expenses
    const ctx2 = setupTestDb()
    const app2 = buildApp()

    // Seed exchange rates
    const now = Date.now()
    await db.insert(exchangeRates).values([
      { base: "USD", target: "EUR", rate: 0.92, fetchedAt: now },
    ])

    const user = await registerUser(app2, "balance-test@test.com", "Balance Tester")
    const cookie = user.cookie

    const groupRes = await req(app2, "POST", "/api/groups", {
      name: "Balance Test Group",
      currency: "EUR",
    }, { Cookie: cookie })
    const gBody = (await groupRes.json()) as any
    const gId = gBody.group.id
    const m1Id = gBody.group.members[0].id

    const m2Res = await req(app2, "POST", `/api/groups/${gId}/members`, {
      name: "Bob",
    }, { Cookie: cookie })
    const m2Body = (await m2Res.json()) as any
    const m2Id = m2Body.member.id

    // Create EUR expense: m1 paid 100 EUR, split equally (50 each)
    await req(app2, "POST", `/api/groups/${gId}/expenses`, {
      title: "EUR Dinner",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId: m1Id, amount: 100 }],
      splits: [{ memberId: m1Id }, { memberId: m2Id }],
    }, { Cookie: cookie })

    // Create USD expense: m1 paid 50 USD, split equally (25 each)
    // exchangeRate should be 0.92 (USD->EUR)
    await req(app2, "POST", `/api/groups/${gId}/expenses`, {
      title: "USD Lunch",
      amount: 50,
      currency: "USD",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId: m1Id, amount: 50 }],
      splits: [{ memberId: m1Id }, { memberId: m2Id }],
    }, { Cookie: cookie })

    // Get balances
    const balRes = await req(app2, "GET", `/api/groups/${gId}/balances`, undefined, {
      Cookie: cookie,
    })
    expect(balRes.status).toBe(200)
    const balBody = (await balRes.json()) as any

    const m1Bal = balBody.balances.find((b: any) => b.memberId === m1Id)
    const m2Bal = balBody.balances.find((b: any) => b.memberId === m2Id)

    // EUR expense: m1 paid 100 * 1.0 = 100 EUR, owes 50 * 1.0 = 50 EUR -> net +50
    // USD expense: m1 paid 50 * 0.92 = 46 EUR, owes 25 * 0.92 = 23 EUR -> net +23
    // Total m1: +73, m2: -73
    expect(m1Bal.balance).toBe(73)
    expect(m2Bal.balance).toBe(-73)

    ctx2.cleanup()
  })
})
