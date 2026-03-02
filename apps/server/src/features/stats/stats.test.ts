import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "../expenses"
import { settlementRoutes } from "../settlements"
import { statsRoutes } from "."
import { exportRoutes } from "../exports"

let cleanup: () => Promise<void>

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(groupRoutes)
    .use(expenseRoutes)
    .use(settlementRoutes)
    .use(statsRoutes)
    .use(exportRoutes)
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

describe("Stats & Export", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let memberId: string
  let member2Id: string
  let member3Id: string

  beforeAll(async () => {
    const ctx = await setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Create group (this also creates the first member and sets session cookie)
    const groupRes = await req(app, "POST", "/api/groups", {
      name: "Stats Test Group",
      memberName: "Stats User",
      currency: "EUR",
    })
    const sessionCookie = getSessionCookie(groupRes)
    userCookie = cookieValue(sessionCookie!)
    const groupBody = (await groupRes.json()) as any
    groupId = groupBody.group.id
    memberId = groupBody.group.members[0].id

    // Add members
    const m2Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Alice",
    }, { Cookie: userCookie })
    member2Id = ((await m2Res.json()) as any).member.id

    const m3Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Bob",
    }, { Cookie: userCookie })
    member3Id = ((await m3Res.json()) as any).member.id

    // Create expenses at known dates
    // January 2024 expense: 90 EUR, paid by member, split 3 ways
    await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Dinner",
      amount: 90,
      currency: "EUR",
      date: new Date("2024-01-15").getTime(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 90 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    // January 2024 expense: 60 EUR, paid by Alice, split 3 ways
    await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Lunch",
      amount: 60,
      currency: "EUR",
      date: new Date("2024-01-20").getTime(),
      splitMethod: "equal",
      payers: [{ memberId: member2Id, amount: 60 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    // February 2024 expense: 120 EUR, paid by Bob, split equal
    await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      comment: "Hotel",
      amount: 120,
      currency: "EUR",
      date: new Date("2024-02-10").getTime(),
      splitMethod: "equal",
      payers: [{ memberId: member3Id, amount: 120 }],
      splits: [
        { memberId },
        { memberId: member2Id },
        { memberId: member3Id },
      ],
    }, { Cookie: userCookie })

    // Create a settlement for JSON export
    await req(app, "POST", `/api/groups/${groupId}/settlements`, {
      fromId: member2Id,
      toId: memberId,
      amount: 10,
      currency: "EUR",
      date: new Date("2024-02-15").getTime(),
    }, { Cookie: userCookie })
  })

  afterAll(async () => {
    await cleanup()
  })

  test("Get stats for group — correct totals", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/stats`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.totalSpending).toBe(270) // 90 + 60 + 120
    expect(body.expenseCount).toBe(3)
  })

  test("Stats by member show correct paid/owed", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/stats`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any

    const memberStat = body.byMember.find((m: any) => m.memberId === memberId)
    expect(memberStat).toBeDefined()
    expect(memberStat.paid).toBe(90)  // paid 90 for dinner
    expect(memberStat.owed).toBe(90)  // 30 + 20 + 40 = 90 owed across 3 expenses

    const aliceStat = body.byMember.find((m: any) => m.memberId === member2Id)
    expect(aliceStat).toBeDefined()
    expect(aliceStat.paid).toBe(60)   // paid 60 for lunch
    expect(aliceStat.owed).toBe(90)   // 30 + 20 + 40 = 90 owed across 3 expenses

    const bobStat = body.byMember.find((m: any) => m.memberId === member3Id)
    expect(bobStat).toBeDefined()
    expect(bobStat.paid).toBe(120)    // paid 120 for hotel
    expect(bobStat.owed).toBe(90)     // 30 + 20 + 40 = 90 owed across 3 expenses
  })

  test("Monthly aggregation works", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/stats`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.byMonth).toHaveLength(2) // 2024-01 and 2024-02

    const jan = body.byMonth.find((m: any) => m.month === "2024-01")
    expect(jan).toBeDefined()
    expect(jan.total).toBe(150) // 90 + 60

    const feb = body.byMonth.find((m: any) => m.month === "2024-02")
    expect(feb).toBeDefined()
    expect(feb.total).toBe(120)
  })

  test("Stats with date range filter", async () => {
    const from = new Date("2024-02-01").getTime()
    const to = new Date("2024-02-28").getTime()
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/stats?from=${from}&to=${to}`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.totalSpending).toBe(120)
    expect(body.expenseCount).toBe(1)
    expect(body.byMonth).toHaveLength(1)
    expect(body.byMonth[0].month).toBe("2024-02")
  })

  test("Export CSV returns valid CSV content", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/export/csv`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const contentType = res.headers.get("content-type")
    expect(contentType).toContain("text/csv")

    const csv = await res.text()
    const lines = csv.split("\n")
    expect(lines[0]).toBe("Date,Comment,Amount,Currency,Paid By")
    expect(lines.length).toBe(4) // header + 3 expenses

    // Check a line contains expected data
    const hasHotel = lines.some((l) => l.includes("Hotel") && l.includes("120"))
    expect(hasHotel).toBe(true)

    const hasDinner = lines.some((l) => l.includes("Dinner") && l.includes("90"))
    expect(hasDinner).toBe(true)
  })

  test("Export JSON returns valid JSON", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/export/json`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const data = (await res.json()) as any

    expect(data.group).toBeDefined()
    expect(data.group.id).toBe(groupId)
    expect(data.members).toHaveLength(3)
    expect(data.expenses).toHaveLength(3)
    expect(data.settlements).toHaveLength(1)

    // Each expense should have payers and splits
    for (const expense of data.expenses) {
      expect(expense.payers).toBeDefined()
      expect(expense.payers.length).toBeGreaterThanOrEqual(1)
      expect(expense.splits).toBeDefined()
      expect(expense.splits.length).toBeGreaterThanOrEqual(1)
    }
  })
})
