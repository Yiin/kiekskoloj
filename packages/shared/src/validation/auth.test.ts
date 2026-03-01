import { describe, it, expect } from "bun:test"
import { loginSchema, registerSchema } from "./auth"

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "mypassword",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "mypassword",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email")
    }
  })

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "mypassword",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("password")
    }
  })

  it("rejects missing email field", () => {
    const result = loginSchema.safeParse({
      password: "mypassword",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing password field", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
    })
    expect(result.success).toBe(false)
  })

  it("rejects completely empty object", () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("registerSchema", () => {
  it("accepts valid register data", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      name: "Test User",
      password: "longpassword",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "bad-email",
      name: "Test User",
      password: "longpassword",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email")
    }
  })

  it("rejects short password (< 8 chars)", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      name: "Test User",
      password: "short",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.path.includes("password"))
      expect(pwIssue).toBeDefined()
      expect(pwIssue!.message).toContain("at least 8")
    }
  })

  it("accepts exactly 8-char password", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      name: "Test User",
      password: "12345678",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      name: "",
      password: "longpassword",
    })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 100 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      name: "A".repeat(101),
      password: "longpassword",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes("name"))
      expect(nameIssue).toBeDefined()
    }
  })

  it("rejects missing fields", () => {
    expect(registerSchema.safeParse({}).success).toBe(false)
    expect(registerSchema.safeParse({ email: "a@b.com" }).success).toBe(false)
    expect(registerSchema.safeParse({ email: "a@b.com", name: "X" }).success).toBe(false)
  })
})
