import { db } from "../../lib/db"
import { groups, groupMembers, users } from "../../db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"

function generateInviteCode() {
  return nanoid(10)
}

export async function createGroup(
  userId: string,
  data: { name: string; currency?: string; color?: string }
) {
  const groupId = nanoid()
  const now = Date.now()
  const inviteCode = generateInviteCode()

  await db.insert(groups).values({
    id: groupId,
    name: data.name,
    currency: data.currency || "EUR",
    color: data.color || null,
    inviteCode,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  })

  // Look up creator's name from users table
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  const creatorName = user?.name || "Unknown"

  const memberId = nanoid()
  await db.insert(groupMembers).values({
    id: memberId,
    groupId,
    userId,
    name: creatorName,
    role: "admin",
    joinedAt: now,
  })

  return getGroupById(groupId)
}

export async function getUserGroups(userId: string) {
  const members = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId))

  if (members.length === 0) return []

  const groupIds = members.map((m) => m.groupId)
  const allGroups = await db.select().from(groups)

  return allGroups.filter((g) => groupIds.includes(g.id))
}

export async function getGroupById(groupId: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  })
  if (!group) return null

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))

  return { ...group, members }
}

export async function updateGroup(
  groupId: string,
  data: { name?: string; currency?: string; color?: string; archived?: boolean }
) {
  await db
    .update(groups)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(groups.id, groupId))

  return getGroupById(groupId)
}

export async function deleteGroup(groupId: string) {
  await db.delete(groups).where(eq(groups.id, groupId))
}

export async function addMember(
  groupId: string,
  data: { name: string; userId?: string; role?: string; weight?: number }
) {
  const memberId = nanoid()
  const now = Date.now()

  await db.insert(groupMembers).values({
    id: memberId,
    groupId,
    userId: data.userId || null,
    name: data.name,
    role: (data.role as "admin" | "member" | "readonly") || "member",
    weight: data.weight ?? 1.0,
    joinedAt: now,
  })

  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  })
}

export async function updateMember(
  memberId: string,
  data: { name?: string; weight?: number; role?: string; active?: boolean }
) {
  const updateData: Record<string, any> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.weight !== undefined) updateData.weight = data.weight
  if (data.role !== undefined) updateData.role = data.role
  if (data.active !== undefined) updateData.active = data.active

  await db.update(groupMembers).set(updateData).where(eq(groupMembers.id, memberId))

  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  })
}

export async function removeMember(memberId: string) {
  await db.delete(groupMembers).where(eq(groupMembers.id, memberId))
}

export async function regenerateInviteCode(groupId: string) {
  const newCode = generateInviteCode()
  await db
    .update(groups)
    .set({ inviteCode: newCode, updatedAt: Date.now() })
    .where(eq(groups.id, groupId))

  return { inviteCode: newCode }
}

export async function joinGroup(inviteCode: string, userId: string, userName: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, inviteCode),
  })
  if (!group) return null

  // Check if user is already a member
  const existing = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, userId)
    ),
  })
  if (existing) return { group, member: existing, alreadyMember: true }

  const memberId = nanoid()
  const now = Date.now()

  await db.insert(groupMembers).values({
    id: memberId,
    groupId: group.id,
    userId,
    name: userName,
    role: "member",
    joinedAt: now,
  })

  const member = await db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  })

  return { group, member, alreadyMember: false }
}
