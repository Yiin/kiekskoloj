import { db } from "../../lib/db"
import { categories } from "../../db/schema"
import { eq, or, isNull } from "drizzle-orm"
import { nanoid } from "nanoid"
import { DEFAULT_CATEGORIES } from "@kiekskoloj/shared"

export async function getCategories(groupId: string) {
  return db
    .select()
    .from(categories)
    .where(or(isNull(categories.groupId), eq(categories.groupId, groupId)))
}

export async function createCategory(
  groupId: string,
  data: { name: string; icon?: string; color?: string },
) {
  const id = nanoid()
  await db.insert(categories).values({
    id,
    groupId,
    name: data.name,
    icon: data.icon || null,
    color: data.color || null,
  })
  return db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .then((rows) => rows[0])
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; icon?: string; color?: string },
) {
  const updateData: Record<string, any> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.color !== undefined) updateData.color = data.color

  await db.update(categories).set(updateData).where(eq(categories.id, categoryId))
  return db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .then((rows) => rows[0] || null)
}

export async function deleteCategory(categoryId: string) {
  await db.delete(categories).where(eq(categories.id, categoryId))
}

export async function seedDefaultCategories() {
  // Check if global presets already exist
  const existing = await db
    .select()
    .from(categories)
    .where(isNull(categories.groupId))

  if (existing.length > 0) return

  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      id: nanoid(),
      groupId: null,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
    })
  }
}
