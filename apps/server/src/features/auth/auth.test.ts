import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { authRoutes } from "./index"

let cleanup: () => void

/** Build a test-only Elysia app (no listen, no cors, no swagger). */
function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(authRoutes)
    .get("/health", () => ({ status: "ok" }))
}

/** Helper to make a JSON request against the app. */
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

/** Extract Set-Cookie header value for the `auth` cookie. */
function getAuthCookie(res: Response): string | null {
  const setCookie = res.headers.getSetCookie?.()
  if (!setCookie) return null
  for (const c of setCookie) {
    if (c.startsWith("auth=")) return c
  }
  return null
}

/** Parse just the `auth=<token>` part from a full Set-Cookie string. */
function cookieValue(setCookie: string): string {
  return setCookie.split(";")[0] // "auth=<jwt>"
}

describe("Auth endpoints", () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(() => {
    const ctx = setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()
  })

  afterAll(() => {
    cleanup()
  })

  // -- Health --
  describe("GET /api/health", () => {
    it("returns ok", async () => {
      const res = await req(app, "GET", "/api/health")
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual({ status: "ok" })
    })
  })

  // -- Register --
  describe("POST /api/auth/register", () => {
    it("creates a user and returns auth cookie", async () => {
      const res = await req(app, "POST", "/api/auth/register", {
        email: "alice@example.com",
        name: "Alice",
        password: "password123",
      })
      expect(res.status).toBe(200)

      const json = await res.json() as any
      expect(json.user).toBeDefined()
      expect(json.user.email).toBe("alice@example.com")
      expect(json.user.name).toBe("Alice")
      // Should not leak password hash
      expect(json.user.passwordHash).toBeUndefined()

      const cookie = getAuthCookie(res)
      expect(cookie).not.toBeNull()
      expect(cookie).toContain("auth=")
    })

    it("returns 409 for duplicate email", async () => {
      const res = await req(app, "POST", "/api/auth/register", {
        email: "alice@example.com",
        name: "Alice Duplicate",
        password: "password123",
      })
      expect(res.status).toBe(409)
      const json = await res.json() as any
      expect(json.error).toBe("CONFLICT")
    })

    it("returns 422 for invalid body (missing name)", async () => {
      const res = await req(app, "POST", "/api/auth/register", {
        email: "bob@example.com",
        password: "password123",
      })
      expect(res.status).toBe(422)
    })

    it("returns 422 for short password", async () => {
      const res = await req(app, "POST", "/api/auth/register", {
        email: "bob@example.com",
        name: "Bob",
        password: "short",
      })
      expect(res.status).toBe(422)
    })
  })

  // -- Login --
  describe("POST /api/auth/login", () => {
    it("returns user and auth cookie for valid credentials", async () => {
      const res = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "password123",
      })
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.user.email).toBe("alice@example.com")

      const cookie = getAuthCookie(res)
      expect(cookie).not.toBeNull()
    })

    it("returns 401 for wrong password", async () => {
      const res = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "wrongpassword",
      })
      expect(res.status).toBe(401)
      const json = await res.json() as any
      expect(json.error).toBe("UNAUTHORIZED")
    })

    it("returns 401 for non-existent email", async () => {
      const res = await req(app, "POST", "/api/auth/login", {
        email: "nobody@example.com",
        password: "password123",
      })
      expect(res.status).toBe(401)
    })
  })

  // -- GET /me --
  describe("GET /api/auth/me", () => {
    it("returns user when authenticated", async () => {
      // Login first to get a cookie
      const loginRes = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "password123",
      })
      const cookie = getAuthCookie(loginRes)
      expect(cookie).not.toBeNull()

      const res = await req(app, "GET", "/api/auth/me", undefined, {
        Cookie: cookieValue(cookie!),
      })
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.user.email).toBe("alice@example.com")
    })

    it("returns 401 without auth cookie", async () => {
      const res = await req(app, "GET", "/api/auth/me")
      expect(res.status).toBe(401)
    })

    it("returns 401 with invalid token", async () => {
      const res = await req(app, "GET", "/api/auth/me", undefined, {
        Cookie: "auth=invalid-jwt-token",
      })
      expect(res.status).toBe(401)
    })
  })

  // -- PUT /me --
  describe("PUT /api/auth/me", () => {
    it("updates user name", async () => {
      // Login first
      const loginRes = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "password123",
      })
      const cookie = cookieValue(getAuthCookie(loginRes)!)

      const res = await req(app, "PUT", "/api/auth/me", { name: "Alice Updated" }, {
        Cookie: cookie,
      })
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.user.name).toBe("Alice Updated")
    })

    it("updates user locale", async () => {
      const loginRes = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "password123",
      })
      const cookie = cookieValue(getAuthCookie(loginRes)!)

      const res = await req(app, "PUT", "/api/auth/me", { locale: "eo" }, {
        Cookie: cookie,
      })
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.user.locale).toBe("eo")
    })

    it("returns 401 without auth", async () => {
      const res = await req(app, "PUT", "/api/auth/me", { name: "Hacker" })
      expect(res.status).toBe(401)
    })
  })

  // -- Logout --
  describe("POST /api/auth/logout", () => {
    it("clears auth cookie", async () => {
      // Login first
      const loginRes = await req(app, "POST", "/api/auth/login", {
        email: "alice@example.com",
        password: "password123",
      })
      const cookie = cookieValue(getAuthCookie(loginRes)!)

      const res = await req(app, "POST", "/api/auth/logout", undefined, {
        Cookie: cookie,
      })
      // The handler returns `new Response(null, { status: 204 })`
      expect(res.status).toBe(204)
    })
  })
})
