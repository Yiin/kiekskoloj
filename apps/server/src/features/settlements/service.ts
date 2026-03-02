import { db } from "../../lib/db"
import {
  settlements,
  expensePayers,
  expenseSplits,
  expenses,
  groupMembers,
} from "../../db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { simplifyDebts } from "@kiekskoloj/shared"
import { wsManager } from "../../lib/ws"
import { logActivity } from "../activity/service"

export async function createSettlement(
  groupId: string,
  memberId: string,
  data: {
    fromId: string
    toId: string
    amount: number
    currency: string
    date: number
    note?: string
  },
  senderToken?: string,
) {
  const id = nanoid()
  const now = Date.now()

  await db.insert(settlements).values({
    id,
    groupId,
    fromId: data.fromId,
    toId: data.toId,
    amount: data.amount,
    currency: data.currency,
    note: data.note || null,
    date: data.date,
    createdBy: memberId,
    createdAt: now,
  })

  const settlement = await db.query.settlements.findFirst({
    where: eq(settlements.id, id),
  })

  // Broadcast and log activity (fire-and-forget)
  if (settlement) {
    wsManager.broadcast(groupId, { type: "settlement:created", groupId, settlement }, senderToken)
    logActivity(groupId, memberId, "settlement_created", "settlement", id, { amount: data.amount, fromId: data.fromId, toId: data.toId }).catch(() => {})
  }

  return settlement
}

export async function getSettlements(
  groupId: string,
  options?: { limit?: number; offset?: number },
) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.date))
    .limit(limit)
    .offset(offset)

  return rows
}

export async function deleteSettlement(
  settlementId: string,
  groupId?: string,
  memberId?: string,
  senderToken?: string,
) {
  await db.delete(settlements).where(eq(settlements.id, settlementId))

  // Broadcast and log activity (fire-and-forget)
  if (groupId && memberId) {
    wsManager.broadcast(groupId, { type: "settlement:deleted", groupId, settlementId }, senderToken)
    logActivity(groupId, memberId, "settlement_deleted", "settlement", settlementId).catch(() => {})
  }
}

export async function getGroupBalances(groupId: string) {
  // 1. Get all members of the group
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))

  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  // 2. Sum expense_payers per member (what each member paid), converting to group currency
  // When exchangeRate is not null, multiply amounts by it to convert to group currency.
  // When exchangeRate is null, the expense is already in group currency (rate = 1).
  const paidRows = await db
    .select({
      memberId: expensePayers.memberId,
      total: sql<number>`sum(${expensePayers.amount} * coalesce(${expenses.exchangeRate}, 1.0))`.as("total"),
    })
    .from(expensePayers)
    .innerJoin(expenses, eq(expenses.id, expensePayers.expenseId))
    .where(eq(expenses.groupId, groupId))
    .groupBy(expensePayers.memberId)

  // 3. Sum expense_splits per member (what each member owes), converting to group currency
  const owedRows = await db
    .select({
      memberId: expenseSplits.memberId,
      total: sql<number>`sum(${expenseSplits.amount} * coalesce(${expenses.exchangeRate}, 1.0))`.as("total"),
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
    .where(eq(expenses.groupId, groupId))
    .groupBy(expenseSplits.memberId)

  // 4. Sum settlements sent (fromId) and received (toId)
  const sentRows = await db
    .select({
      memberId: settlements.fromId,
      total: sql<number>`sum(${settlements.amount})`.as("total"),
    })
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .groupBy(settlements.fromId)

  const receivedRows = await db
    .select({
      memberId: settlements.toId,
      total: sql<number>`sum(${settlements.amount})`.as("total"),
    })
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .groupBy(settlements.toId)

  // 5. Compute net balance per member
  // balance = paid - owed + sent - received
  // "sent" = settlements you sent (paying off your debt improves your balance)
  // "received" = settlements you received (being repaid reduces your positive balance)
  // positive = owed money (others owe you), negative = owes money (you owe others)
  const paidMap = new Map(paidRows.map((r) => [r.memberId, r.total]))
  const owedMap = new Map(owedRows.map((r) => [r.memberId, r.total]))
  const sentMap = new Map(sentRows.map((r) => [r.memberId, r.total]))
  const receivedMap = new Map(receivedRows.map((r) => [r.memberId, r.total]))

  const balanceMap = new Map<string, number>()
  const balances: { memberId: string; memberName: string; balance: number }[] = []

  for (const member of members) {
    const paid = paidMap.get(member.id) ?? 0
    const owed = owedMap.get(member.id) ?? 0
    const sent = sentMap.get(member.id) ?? 0
    const received = receivedMap.get(member.id) ?? 0
    const balance = Math.round((paid - owed + sent - received) * 100) / 100

    balanceMap.set(member.id, balance)
    balances.push({
      memberId: member.id,
      memberName: member.name,
      balance,
    })
  }

  // 6. Simplify debts
  const debts = simplifyDebts(balanceMap)

  return { balances, debts }
}
