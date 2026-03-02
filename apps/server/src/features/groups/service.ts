import { db } from "../../lib/db"
import { groups, groupMembers } from "../../db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"

function generateInviteCode() {
  return nanoid(10)
}

export function generateSessionToken() {
  return nanoid(21)
}

export async function createGroup(
  data: { name: string; currency?: string; color?: string },
  memberName: string,
  sessionToken: string,
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
    createdAt: now,
    updatedAt: now,
  })

  const memberId = nanoid()
  await db.insert(groupMembers).values({
    id: memberId,
    groupId,
    name: memberName,
    token: sessionToken,
    joinedAt: now,
  })

  return getGroupById(groupId)
}

export async function getGroupsByToken(token: string) {
  const members = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.token, token))

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
    .select({
      id: groupMembers.id,
      groupId: groupMembers.groupId,
      name: groupMembers.name,
      weight: groupMembers.weight,
      active: groupMembers.active,
      joinedAt: groupMembers.joinedAt,
    })
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
  data: { name: string; weight?: number }
) {
  const memberId = nanoid()
  const now = Date.now()

  await db.insert(groupMembers).values({
    id: memberId,
    groupId,
    name: data.name,
    weight: data.weight ?? 1.0,
    joinedAt: now,
  })

  return db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  })
}

export async function updateMember(
  memberId: string,
  data: { name?: string; weight?: number; active?: boolean }
) {
  const updateData: Record<string, any> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.weight !== undefined) updateData.weight = data.weight
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

export async function joinGroup(inviteCode: string, memberName: string, sessionToken: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.inviteCode, inviteCode),
  })
  if (!group) return null

  // Check if this session already has a member in this group
  const existingByToken = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.token, sessionToken)
    ),
  })
  if (existingByToken) return { group, member: existingByToken, alreadyMember: true }

  // Check if name is already taken in this group
  const existingByName = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.name, memberName)
    ),
  })
  if (existingByName) {
    throw new Error("CONFLICT:Name already taken in this group")
  }

  const memberId = nanoid()
  const now = Date.now()

  await db.insert(groupMembers).values({
    id: memberId,
    groupId: group.id,
    name: memberName,
    token: sessionToken,
    joinedAt: now,
  })

  const member = await db.query.groupMembers.findFirst({
    where: eq(groupMembers.id, memberId),
  })

  return { group, member, alreadyMember: false }
}
