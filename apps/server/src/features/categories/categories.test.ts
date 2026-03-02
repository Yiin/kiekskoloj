import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "../expenses"
import { categoryRoutes } from "."
import { seedDefaultCategories } from "./service"

let cleanup: () => void

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(groupRoutes)
    .use(expenseRoutes)
    .use(categoryRoutes)
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

describe("Categories", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let memberId: string
  let customCategoryId: string

  beforeAll(async () => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    // Seed default categories
    await seedDefaultCategories()

    // Create group (this also creates the first member and sets session cookie)
    const groupRes = await req(app, "POST", "/api/groups", {
      name: "Category Test Group",
      memberName: "Category User",
      currency: "EUR",
    })
    const sessionCookie = getSessionCookie(groupRes)
    userCookie = cookieValue(sessionCookie!)
    const groupBody = (await groupRes.json()) as any
    groupId = groupBody.group.id
    memberId = groupBody.group.members[0].id
  })

  afterAll(() => {
    cleanup()
  })

  test("List categories returns global presets", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/categories`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.categories).toBeDefined()
    expect(body.categories.length).toBeGreaterThanOrEqual(14) // 14 default categories
    // Check that Food & Dining is present
    const food = body.categories.find((c: any) => c.name === "Food & Dining")
    expect(food).toBeDefined()
    expect(food.icon).toBe("utensils")
    expect(food.groupId).toBeNull()
  })

  test("Create custom category", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/categories`, {
      name: "Custom Category",
      icon: "star",
      color: "#ff0000",
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.category).toBeDefined()
    expect(body.category.name).toBe("Custom Category")
    expect(body.category.icon).toBe("star")
    expect(body.category.color).toBe("#ff0000")
    expect(body.category.groupId).toBe(groupId)
    customCategoryId = body.category.id
  })

  test("Custom category appears in list", async () => {
    const res = await req(
      app,
      "GET",
      `/api/groups/${groupId}/categories`,
      undefined,
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    const custom = body.categories.find((c: any) => c.id === customCategoryId)
    expect(custom).toBeDefined()
    expect(custom.name).toBe("Custom Category")
  })

  test("Update category", async () => {
    const res = await req(
      app,
      "PUT",
      `/api/groups/${groupId}/categories/${customCategoryId}`,
      { name: "Updated Category", icon: "heart", color: "#00ff00" },
      { Cookie: userCookie },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.category.name).toBe("Updated Category")
    expect(body.category.icon).toBe("heart")
    expect(body.category.color).toBe("#00ff00")
  })

  test("Delete category", async () => {
    // Create a category to delete
    const createRes = await req(app, "POST", `/api/groups/${groupId}/categories`, {
      name: "To Delete",
    }, { Cookie: userCookie })
    const createBody = (await createRes.json()) as any
    const deleteId = createBody.category.id

    const res = await req(
      app,
      "DELETE",
      `/api/groups/${groupId}/categories/${deleteId}`,
      undefined,
      { Cookie: userCookie },
    )
    expect(res.status).toBe(204)

    // Verify it's gone from the list
    const listRes = await req(
      app,
      "GET",
      `/api/groups/${groupId}/categories`,
      undefined,
      { Cookie: userCookie },
    )
    const listBody = (await listRes.json()) as any
    const deleted = listBody.categories.find((c: any) => c.id === deleteId)
    expect(deleted).toBeUndefined()
  })

  test("Categories appear in expense when set", async () => {
    // Add a member for splits
    const m2Res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Member Two",
    }, { Cookie: userCookie })
    const m2Body = (await m2Res.json()) as any
    const member2Id = m2Body.member.id

    // Create expense with the custom category
    const res = await req(app, "POST", `/api/groups/${groupId}/expenses`, {
      title: "Categorized Expense",
      amount: 50,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      categoryId: customCategoryId,
      payers: [{ memberId, amount: 50 }],
      splits: [{ memberId }, { memberId: member2Id }],
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.categoryId).toBe(customCategoryId)
  })
})
