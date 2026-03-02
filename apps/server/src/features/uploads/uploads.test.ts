import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { Elysia } from "elysia"
import { setupTestDb } from "../../test-utils"
import { groupRoutes } from "../groups"
import { expenseRoutes } from "../expenses"
import { uploadRoutes } from "."
import { getUploadDir } from "./service"
import { mkdir, rm } from "fs/promises"
import { existsSync } from "fs"

let cleanup: () => Promise<void>

function buildApp() {
  return new Elysia({ prefix: "/api" })
    .use(groupRoutes)
    .use(expenseRoutes)
    .use(uploadRoutes)
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

async function createGroupAndSetup(app: ReturnType<typeof buildApp>) {
  // Create group (this also creates the first member and sets session cookie)
  const groupRes = await app.handle(new Request("http://localhost/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Upload Test Group",
      memberName: "Upload User",
      currency: "EUR",
    }),
  }))
  const cookie = cookieValue(getSessionCookie(groupRes)!)
  const groupBody = (await groupRes.json()) as any
  const groupId = groupBody.group.id
  const memberId = groupBody.group.members[0].id

  // Create an expense
  const expRes = await app.handle(new Request(`http://localhost/api/groups/${groupId}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "Receipt Test Expense",
      amount: 100,
      currency: "EUR",
      date: Date.now(),
      splitMethod: "equal",
      payers: [{ memberId, amount: 100 }],
      splits: [{ memberId }],
    }),
  }))
  const expBody = (await expRes.json()) as any
  const expenseId = expBody.expense.id

  return { cookie, groupId, memberId, expenseId }
}

describe("Uploads / Receipts", () => {
  let app: ReturnType<typeof buildApp>
  let userCookie: string
  let groupId: string
  let expenseId: string
  let receiptId: string
  let uploadDir: string

  beforeAll(async () => {
    const ctx = await setupTestDb()
    cleanup = ctx.cleanup
    app = buildApp()

    uploadDir = getUploadDir()
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const setup = await createGroupAndSetup(app)
    userCookie = setup.cookie
    groupId = setup.groupId
    expenseId = setup.expenseId
  })

  afterAll(async () => {
    // Clean up upload directory
    try {
      if (existsSync(uploadDir)) {
        await rm(uploadDir, { recursive: true })
      }
    } catch {
      // Ignore
    }
    await cleanup()
  })

  test("Upload a receipt", async () => {
    const fileContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG magic bytes
    const file = new File([fileContent], "receipt.jpg", { type: "image/jpeg" })

    const formData = new FormData()
    formData.append("file", file)

    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts`,
      {
        method: "POST",
        headers: { Cookie: userCookie },
        body: formData,
      },
    ))

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.receipt).toBeDefined()
    expect(body.receipt.expenseId).toBe(expenseId)
    expect(body.receipt.mimeType).toBe("image/jpeg")
    expect(body.receipt.size).toBe(4)
    receiptId = body.receipt.id
  })

  test("Get receipt metadata via expense detail", async () => {
    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json", Cookie: userCookie },
      },
    ))

    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.expense.receipts).toBeDefined()
    expect(body.expense.receipts.length).toBeGreaterThanOrEqual(1)
    const receipt = body.expense.receipts.find((r: any) => r.id === receiptId)
    expect(receipt).toBeDefined()
    expect(receipt.mimeType).toBe("image/jpeg")
  })

  test("Download receipt file", async () => {
    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts/${receiptId}`,
      {
        method: "GET",
        headers: { Cookie: userCookie },
      },
    ))

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
  })

  test("Delete receipt", async () => {
    // Upload a second receipt to delete
    const file = new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], "receipt2.png", { type: "image/png" })
    const formData = new FormData()
    formData.append("file", file)

    const uploadRes = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts`,
      {
        method: "POST",
        headers: { Cookie: userCookie },
        body: formData,
      },
    ))
    const uploadBody = (await uploadRes.json()) as any
    const deleteReceiptId = uploadBody.receipt.id

    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts/${deleteReceiptId}`,
      {
        method: "DELETE",
        headers: { Cookie: userCookie },
      },
    ))
    expect(res.status).toBe(204)

    // Verify it's gone
    const getRes = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts/${deleteReceiptId}`,
      {
        method: "GET",
        headers: { Cookie: userCookie },
      },
    ))
    expect(getRes.status).toBe(404)
  })

  test("Reject files over 10MB", async () => {
    const largeContent = new Uint8Array(10 * 1024 * 1024 + 1) // Just over 10MB
    const file = new File([largeContent], "huge.jpg", { type: "image/jpeg" })

    const formData = new FormData()
    formData.append("file", file)

    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts`,
      {
        method: "POST",
        headers: { Cookie: userCookie },
        body: formData,
      },
    ))

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe("UPLOAD_ERROR")
    expect(body.message).toContain("10MB")
  })

  test("Reject invalid mime types", async () => {
    const file = new File([new Uint8Array([0x00])], "script.sh", { type: "application/x-sh" })

    const formData = new FormData()
    formData.append("file", file)

    const res = await app.handle(new Request(
      `http://localhost/api/groups/${groupId}/expenses/${expenseId}/receipts`,
      {
        method: "POST",
        headers: { Cookie: userCookie },
        body: formData,
      },
    ))

    expect(res.status).toBe(400)
    const body = (await res.json()) as any
    expect(body.error).toBe("UPLOAD_ERROR")
    expect(body.message).toContain("Invalid file type")
  })
})
