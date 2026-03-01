import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { authRoutes } from "../auth"
import { groupRoutes } from "../groups"
import { settlementRoutes } from "."
import { db } from "../../lib/db"
import { expenses, expensePayers, expenseSplits } from "../../db/schema"
import { nanoid } from "nanoid"

let cleanup: () => void

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .use(groupRoutes)
    .use(settlementRoutes)
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

/**
 * Insert an expense directly into the DB.
 * payers: array of { memberId, amount }
 * splits: array of { memberId, amount }
 */
async function insertExpense(
  groupId: string,
  createdBy: string,
  amount: number,
  payers: { memberId: string; amount: number }[],
  splits: { memberId: string; amount: number }[],
) {
  const expenseId = nanoid()
  const now = Date.now()

  await db.insert(expenses).values({
    id: expenseId,
    groupId,
    title: "Test expense",
    amount,
    currency: "EUR",
    date: now,
    splitMethod: "amount",
    createdBy,
    createdAt: now,
    updatedAt: now,
  })

  for (const p of payers) {
    await db.insert(expensePayers).values({
      id: nanoid(),
      expenseId,
      memberId: p.memberId,
      amount: p.amount,
    })
  }

  for (const s of splits) {
    await db.insert(expenseSplits).values({
      id: nanoid(),
      expenseId,
      memberId: s.memberId,
      amount: s.amount,
    })
  }

  return expenseId
}

describe("Settlements & Balances", () => {
  let app: ReturnType<typeof buildApp>
  let user1Cookie: string
  let user1: any
  let user2Cookie: string
  let user2: any
  let outsiderCookie: string
  let groupId: string
  let member1Id: string
  let member2Id: string
  let settlementId: string

  beforeAll(async () => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Register two users
    const u1 = await registerUser(app, "alice@test.com", "Alice")
    user1Cookie = u1.cookie
    user1 = u1.user

    const u2 = await registerUser(app, "bob@test.com", "Bob")
    user2Cookie = u2.cookie
    user2 = u2.user

    // Register outsider
    const outsider = await registerUser(app, "outsider@test.com", "Outsider")
    outsiderCookie = outsider.cookie

    // User1 creates a group
    const createRes = await req(app, "POST", "/api/groups", {
      name: "Test Group",
      currency: "EUR",
    }, { Cookie: user1Cookie })
    const createBody = (await createRes.json()) as any
    groupId = createBody.group.id
    member1Id = createBody.group.members[0].id

    // User2 joins via invite code
    const inviteCode = createBody.group.inviteCode
    const joinRes = await req(app, "POST", `/api/groups/join/${inviteCode}`, {
      name: "Bob",
    }, { Cookie: user2Cookie })
    const joinBody = (await joinRes.json()) as any
    member2Id = joinBody.member.id

    // Create expenses to establish balances:
    // Alice paid 100, split equally between Alice and Bob
    // So Alice paid 100, owes 50 -> net +50
    // Bob paid 0, owes 50 -> net -50
    await insertExpense(groupId, member1Id, 100, [
      { memberId: member1Id, amount: 100 },
    ], [
      { memberId: member1Id, amount: 50 },
      { memberId: member2Id, amount: 50 },
    ])
  })

  afterAll(() => {
    cleanup()
  })

  test("Get balances for a group with expenses - correct net balances", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/balances`, undefined, {
      Cookie: user1Cookie,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as any

    expect(body.balances).toBeDefined()
    expect(body.balances).toHaveLength(2)

    const aliceBal = body.balances.find((b: any) => b.memberId === member1Id)
    const bobBal = body.balances.find((b: any) => b.memberId === member2Id)

    // Alice: paid 100 - owed 50 = +50 (is owed money)
    expect(aliceBal.balance).toBe(50)
    // Bob: paid 0 - owed 50 = -50 (owes money)
    expect(bobBal.balance).toBe(-50)
  })

  test("Get balances includes simplified debts", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/balances`, undefined, {
      Cookie: user1Cookie,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as any

    expect(body.debts).toBeDefined()
    expect(body.debts).toHaveLength(1)
    expect(body.debts[0].from).toBe(member2Id) // Bob owes
    expect(body.debts[0].to).toBe(member1Id)   // Alice is owed
    expect(body.debts[0].amount).toBe(50)
  })

  test("Create a settlement", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/settlements`, {
      fromId: member2Id,
      toId: member1Id,
      amount: 20,
      currency: "EUR",
      date: Date.now(),
      note: "Partial payment",
    }, { Cookie: user1Cookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.settlement).toBeDefined()
    expect(body.settlement.fromId).toBe(member2Id)
    expect(body.settlement.toId).toBe(member1Id)
    expect(body.settlement.amount).toBe(20)
    expect(body.settlement.note).toBe("Partial payment")

    settlementId = body.settlement.id
  })

  test("List settlements", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/settlements`, undefined, {
      Cookie: user1Cookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.settlements).toBeDefined()
    expect(body.settlements.length).toBeGreaterThanOrEqual(1)
    expect(body.settlements.some((s: any) => s.id === settlementId)).toBe(true)
  })

  test("Balances update after settlement", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/balances`, undefined, {
      Cookie: user1Cookie,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as any

    const aliceBal = body.balances.find((b: any) => b.memberId === member1Id)
    const bobBal = body.balances.find((b: any) => b.memberId === member2Id)

    // Settlement: Bob sent 20 to Alice.
    // balance = paid - owed + sent - received
    // Alice: 100 - 50 + 0 - 20 = 30 (received settlement reduces her credit)
    // Bob: 0 - 50 + 20 - 0 = -30 (sent settlement reduces his debt)
    expect(aliceBal.balance).toBe(30)
    expect(bobBal.balance).toBe(-30)
  })

  test("Settlement reduces debt between members", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}/balances`, undefined, {
      Cookie: user1Cookie,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as any

    expect(body.debts).toHaveLength(1)
    expect(body.debts[0].from).toBe(member2Id)
    expect(body.debts[0].to).toBe(member1Id)
    expect(body.debts[0].amount).toBe(30)
  })

  test("After full settlement, members have zero balance", async () => {
    // Create another settlement for the remaining 30
    const res = await req(app, "POST", `/api/groups/${groupId}/settlements`, {
      fromId: member2Id,
      toId: member1Id,
      amount: 30,
      currency: "EUR",
      date: Date.now(),
    }, { Cookie: user1Cookie })
    expect(res.status).toBe(200)

    // Check balances
    const balRes = await req(app, "GET", `/api/groups/${groupId}/balances`, undefined, {
      Cookie: user1Cookie,
    })
    expect(balRes.status).toBe(200)
    const body = (await balRes.json()) as any

    const aliceBal = body.balances.find((b: any) => b.memberId === member1Id)
    const bobBal = body.balances.find((b: any) => b.memberId === member2Id)

    expect(aliceBal.balance).toBe(0)
    expect(bobBal.balance).toBe(0)
    expect(body.debts).toHaveLength(0)
  })

  test("Delete a settlement", async () => {
    const res = await req(
      app,
      "DELETE",
      `/api/groups/${groupId}/settlements/${settlementId}`,
      undefined,
      { Cookie: user1Cookie },
    )
    expect(res.status).toBe(204)

    // Verify it's removed from listing
    const listRes = await req(app, "GET", `/api/groups/${groupId}/settlements`, undefined, {
      Cookie: user1Cookie,
    })
    const listBody = (await listRes.json()) as any
    expect(listBody.settlements.some((s: any) => s.id === settlementId)).toBe(false)
  })

  test("Non-member cannot access settlements (403)", async () => {
    const settlementsRes = await req(
      app,
      "GET",
      `/api/groups/${groupId}/settlements`,
      undefined,
      { Cookie: outsiderCookie },
    )
    expect(settlementsRes.status).toBe(403)

    const balancesRes = await req(
      app,
      "GET",
      `/api/groups/${groupId}/balances`,
      undefined,
      { Cookie: outsiderCookie },
    )
    expect(balancesRes.status).toBe(403)

    const createRes = await req(
      app,
      "POST",
      `/api/groups/${groupId}/settlements`,
      {
        fromId: member2Id,
        toId: member1Id,
        amount: 10,
        currency: "EUR",
        date: Date.now(),
      },
      { Cookie: outsiderCookie },
    )
    expect(createRes.status).toBe(403)
  })
})
