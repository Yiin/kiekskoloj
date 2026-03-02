import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { groupRoutes } from "."

let cleanup: () => Promise<void>

function buildApp() {
  return new Elysia({ prefix: "/api" })
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

async function createGroupAndGetCookie(
  app: ReturnType<typeof buildApp>,
  groupName: string,
  memberName: string,
) {
  const res = await req(app, "POST", "/api/groups", {
    name: groupName,
    memberName,
    currency: "EUR",
  })
  const cookie = getSessionCookie(res)
  const body = (await res.json()) as any
  return { cookie: cookie ? cookieValue(cookie) : "", group: body.group }
}

describe("Groups & Members", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let inviteCode: string
  let offlineMemberId: string

  beforeAll(async () => {
    const ctx = await setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    const result = await createGroupAndGetCookie(app, "Trip to Paris", "Admin User")
    userCookie = result.cookie
    groupId = result.group.id
    inviteCode = result.group.inviteCode
  })

  afterAll(async () => {
    await cleanup()
  })

  test("Create a group - returns group with creator as member", async () => {
    const res = await req(app, "POST", "/api/groups", {
      name: "Test Group",
      memberName: "Creator",
      currency: "USD",
      color: "#FF5733",
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.name).toBe("Test Group")
    expect(body.group.currency).toBe("USD")
    expect(body.group.color).toBe("#FF5733")
    expect(body.group.inviteCode).toBeDefined()
    expect(body.group.members).toHaveLength(1)
    expect(body.group.members[0].name).toBe("Creator")

    // Should set session cookie
    const cookie = getSessionCookie(res)
    expect(cookie).toBeDefined()
  })

  test("List groups - returns created groups", async () => {
    const res = await req(app, "GET", "/api/groups", undefined, {
      Cookie: userCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.groups).toBeDefined()
    expect(body.groups.length).toBeGreaterThanOrEqual(1)
    expect(body.groups.some((g: any) => g.id === groupId)).toBe(true)
  })

  test("Get group by ID - returns group with members", async () => {
    const res = await req(app, "GET", `/api/groups/${groupId}`, undefined, {
      Cookie: userCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.id).toBe(groupId)
    expect(body.group.members).toHaveLength(1)
  })

  test("Update group - any member can update", async () => {
    const res = await req(app, "PUT", `/api/groups/${groupId}`, {
      name: "Trip to Berlin",
      currency: "USD",
      color: "#00FF00",
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group.name).toBe("Trip to Berlin")
    expect(body.group.currency).toBe("USD")
    expect(body.group.color).toBe("#00FF00")
  })

  test("Add member (offline member without token)", async () => {
    const res = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "Offline Person",
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.member).toBeDefined()
    expect(body.member.name).toBe("Offline Person")

    offlineMemberId = body.member.id
  })

  test("Update member weight", async () => {
    const res = await req(app, "PUT", `/api/groups/${groupId}/members/${offlineMemberId}`, {
      weight: 2.0,
    }, { Cookie: userCookie })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.member.weight).toBe(2.0)
  })

  test("Remove member", async () => {
    const addRes = await req(app, "POST", `/api/groups/${groupId}/members`, {
      name: "To Be Removed",
    }, { Cookie: userCookie })
    const addBody = (await addRes.json()) as any
    const removeId = addBody.member.id

    const res = await req(app, "DELETE", `/api/groups/${groupId}/members/${removeId}`, undefined, {
      Cookie: userCookie,
    })
    expect(res.status).toBe(204)
  })

  test("Join via invite code", async () => {
    const res = await req(app, "POST", `/api/groups/join/${inviteCode}`, {
      name: "Other User",
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.group).toBeDefined()
    expect(body.group.id).toBe(groupId)
    expect(body.member).toBeDefined()

    // Should set session cookie
    const cookie = getSessionCookie(res)
    expect(cookie).toBeDefined()
  })

  test("Join with duplicate name fails (409)", async () => {
    const res = await req(app, "POST", `/api/groups/join/${inviteCode}`, {
      name: "Admin User",
    })

    expect(res.status).toBe(409)
  })

  test("Regenerate invite code invalidates old code", async () => {
    const oldCode = inviteCode

    const res = await req(app, "POST", `/api/groups/${groupId}/invite/regenerate`, undefined, {
      Cookie: userCookie,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.inviteCode).toBeDefined()
    expect(body.inviteCode).not.toBe(oldCode)

    // Old invite code should no longer work
    const joinRes = await req(app, "POST", `/api/groups/join/${oldCode}`, {
      name: "Late Joiner",
    })
    expect(joinRes.status).toBe(404)
  })

  test("Non-member cannot access group (403)", async () => {
    // Create a separate session (new group creates new session token)
    const outsider = await createGroupAndGetCookie(app, "Other Group", "Outsider")
    const res = await req(app, "GET", `/api/groups/${groupId}`, undefined, {
      Cookie: outsider.cookie,
    })

    expect(res.status).toBe(403)
  })

  test("Delete group", async () => {
    const temp = await createGroupAndGetCookie(app, "Temp Group", "Temp User")

    const res = await req(app, "DELETE", `/api/groups/${temp.group.id}`, undefined, {
      Cookie: temp.cookie,
    })
    expect(res.status).toBe(204)

    // Verify it's gone
    const getRes = await req(app, "GET", `/api/groups/${temp.group.id}`, undefined, {
      Cookie: temp.cookie,
    })
    expect([403, 404]).toContain(getRes.status)
  })
})
