import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { authRoutes } from "../auth"
import { groupRoutes } from "."

let cleanup: () => void

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .use(groupRoutes)
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

describe("Groups & Members", () => {
  let app: ReturnType<typeof buildApp>
  let adminCookie: string
  let adminUser: any
  let otherCookie: string
  let otherUser: any
  let groupId: string
  let inviteCode: string
  let offlineMemberId: string

  beforeAll(async () => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    const admin = await registerUser(app, "admin@test.com", "Admin User")
    adminCookie = admin.cookie
    adminUser = admin.user

    const other = await registerUser(app, "other@test.com", "Other User")
    otherCookie = other.cookie
    otherUser = other.user
  })

  afterAll(() => {
    cleanup()
  })

  test("Create a group - returns group with user as admin member", async () => {
    const res = await req(app, "POST", "/api/groups", {
      name: "Trip to Paris",
      currency: "EUR",
      color: "#FF5733",
    }, { Cookie: adminCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.name).toBe("Trip to Paris")
    expect(body.group.currency).toBe("EUR")
    expect(body.group.color).toBe("#FF5733")
    expect(body.group.inviteCode).toBeDefined()
    expect(body.group.members).toHaveLength(1)
    expect(body.group.members[0].role).toBe("admin")
    expect(body.group.members[0].userId).toBe(adminUser.id)
    expect(body.group.members[0].name).toBe("Admin User")

    groupId = body.group.id
    inviteCode = body.group.inviteCode
  })

  test("List groups - returns created groups", async () => {
    const res = await req(app, "GET", "/api/groups", undefined, {
      Cookie: adminCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.groups).toBeDefined()
    expect(body.groups.length).toBeGreaterThanOrEqual(1)
    expect(body.groups.some((g: any) => g.id === groupId)).toBe(true)
  })

  test("Get group by ID - returns group with members", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}`, undefined, {
      Cookie: adminCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.id).toBe(groupId)
    expect(body.group.members).toHaveLength(1)
  })

  test("Update group - admin can update name/currency/color", async () => {
    const res = await req(app, "PUT", `/api/groups/${groupId}`, {
      name: "Trip to Berlin",
      currency: "USD",
      color: "#00FF00",
    }, { Cookie: adminCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group.name).toBe("Trip to Berlin")
    expect(body.group.currency).toBe("USD")
    expect(body.group.color).toBe("#00FF00")
  })

  test("Add member (offline member without userId)", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Offline Person",
    }, { Cookie: adminCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.member).toBeDefined()
    expect(body.member.name).toBe("Offline Person")
    expect(body.member.userId).toBeNull()
    expect(body.member.role).toBe("member")

    offlineMemberId = body.member.id
  })

  test("Update member role", async () => {
    const res = await req(app, "PUT", `/api/groups/${groupId}/members/${offlineMemberId}`, {
      role: "readonly",
    }, { Cookie: adminCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.member.role).toBe("readonly")
  })

  test("Remove member", async () => {
    // Add another member to remove
    const addRes = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "To Be Removed",
    }, { Cookie: adminCookie })
    const addBody = (await addRes.json()) as any
    const removeId = addBody.member.id

    const res = await req(app, "DELETE", `/api/groups/${groupId}/members/${removeId}`, undefined, {
      Cookie: adminCookie,
    })
    expect(res.status).toBe(204)
  })

  test("Join via invite code", async () => {
    const res = await req(app, "POST", `/api/groups/join/${inviteCode}`, {
      name: "Other User",
    }, { Cookie: otherCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.id).toBe(groupId)
    expect(body.member).toBeDefined()
    expect(body.member.userId).toBe(otherUser.id)
    expect(body.alreadyMember).toBe(false)
  })

  test("Regenerate invite code invalidates old code", async () => {
    const oldCode = inviteCode

    const res = await req(app, "POST", `/api/groups/${groupId}/invite/regenerate`, undefined, {
      Cookie: adminCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.inviteCode).toBeDefined()
    expect(body.inviteCode).not.toBe(oldCode)

    // Old invite code should no longer work
    const third = await registerUser(app, "third@test.com", "Third User")
    const joinRes = await req(app, "POST", `/api/groups/join/${oldCode}`, {
      name: "Third User",
    }, { Cookie: third.cookie })
    expect(joinRes.status).toBe(404)
  })

  test("Non-admin cannot update group (403)", async () => {
    const res = await req(app, "PUT", `/api/groups/${groupId}`, {
      name: "Hacked Name",
    }, { Cookie: otherCookie })

    expect(res.status).toBe(403)
  })

  test("Non-admin cannot delete group (403)", async () => {
    const res = await req(app, "DELETE", `/api/groups/${groupId}`, undefined, {
      Cookie: otherCookie,
    })

    expect(res.status).toBe(403)
  })

  test("Non-member cannot access group (403)", async () => {
    const outsider = await registerUser(app, "outsider@test.com", "Outsider")
    const res = await req(app, "GET", `/api/groups/${groupId}`, undefined, {
      Cookie: outsider.cookie,
    })

    expect(res.status).toBe(403)
  })

  test("Delete group - admin can delete", async () => {
    // Create a fresh group for deletion
    const createRes = await req(app, "POST", "/api/groups", {
      name: "Temp Group",
    }, { Cookie: adminCookie })
    const createBody = (await createRes.json()) as any
    const tempGroupId = createBody.group.id

    const res = await req(app, "DELETE", `/api/groups/${tempGroupId}`, undefined, {
      Cookie: adminCookie,
    })
    expect(res.status).toBe(204)

    // Verify it's gone
    const getRes = await req(app, "GET", `/api/groups/${tempGroupId}`, undefined, {
      Cookie: adminCookie,
    })
    // Should be 403 (not a member since group is deleted) or 404
    expect([403, 404]).toContain(getRes.status)
  })
})
