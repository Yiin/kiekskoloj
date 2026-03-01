import { db } from "../../lib/db"
import { receipts } from "../../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { join } from "path"
import { mkdir, unlink } from "fs/promises"
import { existsSync } from "fs"

const UPLOAD_DIR = join(import.meta.dir, "../../../../data/uploads")

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

export function getUploadDir() {
  return UPLOAD_DIR
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function uploadReceipt(
  expenseId: string,
  file: File,
) {
  if (file.size > MAX_SIZE) {
    throw new UploadError("File too large. Maximum size is 10MB.", 400)
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new UploadError(
      `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      400,
    )
  }

  await ensureUploadDir()

  const id = nanoid()
  const ext = file.name?.split(".").pop() || "bin"
  const fileName = `${id}.${ext}`
  const filePath = join(UPLOAD_DIR, fileName)

  const buffer = await file.arrayBuffer()
  await Bun.write(filePath, buffer)

  const now = Date.now()
  await db.insert(receipts).values({
    id,
    expenseId,
    filePath: fileName,
    mimeType: file.type,
    size: file.size,
    createdAt: now,
  })

  return db
    .select()
    .from(receipts)
    .where(eq(receipts.id, id))
    .then((rows) => rows[0])
}

export async function getReceipt(receiptId: string) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.id, receiptId))
    .then((rows) => rows[0] || null)
}

export async function getReceiptsByExpenseId(expenseId: string) {
  return db
    .select()
    .from(receipts)
    .where(eq(receipts.expenseId, expenseId))
}

export async function deleteReceipt(receiptId: string) {
  const receipt = await getReceipt(receiptId)
  if (!receipt) return

  const filePath = join(UPLOAD_DIR, receipt.filePath)
  try {
    await unlink(filePath)
  } catch {
    // File may already be gone
  }

  await db.delete(receipts).where(eq(receipts.id, receiptId))
}

export class UploadError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
