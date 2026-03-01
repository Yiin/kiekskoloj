import { db } from "../../lib/db"
import { users } from "../../db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function createUser(email: string, name: string, password: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (existing) throw new Error("CONFLICT:Email already registered")

  const id = nanoid()
  const now = Date.now()
  const passwordHash = await Bun.password.hash(password)

  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  })

  return getUserById(id)
}

export async function verifyLogin(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })
  if (!user) return null

  const valid = await Bun.password.verify(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
  }
}

export async function getUserById(id: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
  }
}

export async function updateUser(id: string, data: { name?: string; locale?: string }) {
  await db.update(users).set({ ...data, updatedAt: Date.now() }).where(eq(users.id, id))
  return getUserById(id)
}
