import { db } from "../../lib/db"
import { expenses, expensePayers, expenseSplits, expenseItems, expenseItemSplits, receipts, groups } from "../../db/schema"
import { eq, and, gte, lte, desc, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getRate } from "../currencies/service"
import { wsManager } from "../../lib/ws"
import { logActivity } from "../activity/service"

type SplitMethod = "equal" | "percentage" | "amount" | "weight" | "shares"

interface PayerInput {
  memberId: string
  amount: number
}

interface SplitInput {
  memberId: string
  amount?: number
  shares?: number
}

interface ItemSplitInput {
  memberId: string
  shares?: number
}

interface ItemInput {
  name: string
  amount: number
  splits: ItemSplitInput[]
}

interface CreateExpenseData {
  title: string
  amount: number
  currency: string
  date: number
  splitMethod: SplitMethod
  categoryId?: string
  note?: string
  payers: PayerInput[]
  splits: SplitInput[]
  items?: ItemInput[]
}

interface GetExpensesOptions {
  page?: number
  limit?: number
  from?: number
  to?: number
  categoryId?: string
  memberId?: string
}

export function calculateSplits(
  amount: number,
  splitMethod: SplitMethod,
  members: SplitInput[],
): Array<{ memberId: string; amount: number; shares?: number }> {
  switch (splitMethod) {
    case "equal": {
      const perPerson = Math.round((amount / members.length) * 100) / 100
      const results = members.map((m) => ({
        memberId: m.memberId,
        amount: perPerson,
      }))
      // Fix rounding: assign remainder to the first member
      const totalAssigned = perPerson * members.length
      const remainder = Math.round((amount - totalAssigned) * 100) / 100
      if (remainder !== 0) {
        results[0].amount = Math.round((results[0].amount + remainder) * 100) / 100
      }
      return results
    }

    case "percentage": {
      return members.map((m) => ({
        memberId: m.memberId,
        amount: Math.round((amount * (m.shares! / 100)) * 100) / 100,
        shares: m.shares,
      }))
    }

    case "amount": {
      return members.map((m) => ({
        memberId: m.memberId,
        amount: m.amount!,
      }))
    }

    case "weight":
    case "shares": {
      const totalShares = members.reduce((sum, m) => sum + (m.shares || 0), 0)
      return members.map((m) => ({
        memberId: m.memberId,
        amount: Math.round((amount * ((m.shares || 0) / totalShares)) * 100) / 100,
        shares: m.shares,
      }))
    }

    default:
      throw new Error(`Unknown split method: ${splitMethod}`)
  }
}

export async function createExpense(
  groupId: string,
  memberId: string,
  data: CreateExpenseData,
  userId?: string,
) {
  const expenseId = nanoid()
  const now = Date.now()

  const computedSplits = calculateSplits(data.amount, data.splitMethod, data.splits)

  // Determine exchange rate if expense currency differs from group currency
  let exchangeRate: number | null = null
  const group = await db
    .select({ currency: groups.currency })
    .from(groups)
    .where(eq(groups.id, groupId))
    .then((rows) => rows[0])

  if (group && data.currency !== group.currency) {
    exchangeRate = await getRate(data.currency, group.currency)
  }

  const sqlite = (db as any).session?.client
  if (sqlite && typeof sqlite.run === "function") {
    sqlite.run("BEGIN")
  }
  try {
    await db.insert(expenses).values({
      id: expenseId,
      groupId,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      exchangeRate,
      date: data.date,
      splitMethod: data.splitMethod,
      categoryId: data.categoryId || null,
      note: data.note || null,
      createdBy: memberId,
      createdAt: now,
      updatedAt: now,
    })

    for (const payer of data.payers) {
      await db.insert(expensePayers).values({
        id: nanoid(),
        expenseId,
        memberId: payer.memberId,
        amount: payer.amount,
      })
    }

    for (const split of computedSplits) {
      await db.insert(expenseSplits).values({
        id: nanoid(),
        expenseId,
        memberId: split.memberId,
        amount: split.amount,
        shares: split.shares ?? null,
      })
    }

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const itemId = nanoid()
        await db.insert(expenseItems).values({
          id: itemId,
          expenseId,
          name: item.name,
          amount: item.amount,
        })
        for (const itemSplit of item.splits) {
          await db.insert(expenseItemSplits).values({
            id: nanoid(),
            itemId,
            memberId: itemSplit.memberId,
            shares: itemSplit.shares ?? 1,
          })
        }
      }
    }

    if (sqlite && typeof sqlite.run === "function") {
      sqlite.run("COMMIT")
    }
  } catch (e) {
    if (sqlite && typeof sqlite.run === "function") {
      sqlite.run("ROLLBACK")
    }
    throw e
  }

  const expense = await getExpenseById(expenseId)

  // Broadcast and log activity (fire-and-forget)
  if (expense) {
    wsManager.broadcast(groupId, { type: "expense:created", groupId, expense }, userId)
    logActivity(groupId, memberId, "expense_created", "expense", expenseId, { title: data.title, amount: data.amount }).catch(() => {})
  }

  return expense
}

export async function getExpenses(groupId: string, options: GetExpensesOptions = {}) {
  const { page = 1, limit = 20, from, to, categoryId, memberId } = options

  const conditions = [eq(expenses.groupId, groupId)]
  if (from) conditions.push(gte(expenses.date, from))
  if (to) conditions.push(lte(expenses.date, to))
  if (categoryId) conditions.push(eq(expenses.categoryId, categoryId))

  const where = conditions.length === 1 ? conditions[0] : and(...conditions)

  let baseExpenses: typeof expenses.$inferSelect[]

  if (memberId) {
    // Filter by member involvement (as payer)
    const payerExpenseIds = await db
      .select({ expenseId: expensePayers.expenseId })
      .from(expensePayers)
      .where(eq(expensePayers.memberId, memberId))

    const ids = payerExpenseIds.map((p) => p.expenseId)

    const allMatching = await db
      .select()
      .from(expenses)
      .where(where!)
      .orderBy(desc(expenses.date))

    baseExpenses = allMatching.filter((e) => ids.includes(e.id))
  } else {
    baseExpenses = await db
      .select()
      .from(expenses)
      .where(where!)
      .orderBy(desc(expenses.date))
  }

  const total = baseExpenses.length
  const offset = (page - 1) * limit
  const paginated = baseExpenses.slice(offset, offset + limit)

  // Attach payers to each expense
  const expensesWithPayers = await Promise.all(
    paginated.map(async (expense) => {
      const payers = await db
        .select()
        .from(expensePayers)
        .where(eq(expensePayers.expenseId, expense.id))
      return { ...expense, payers }
    }),
  )

  return {
    expenses: expensesWithPayers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getExpenseById(expenseId: string) {
  const expense = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .then((rows) => rows[0] || null)

  if (!expense) return null

  const payers = await db
    .select()
    .from(expensePayers)
    .where(eq(expensePayers.expenseId, expenseId))

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId))

  const items = await db
    .select()
    .from(expenseItems)
    .where(eq(expenseItems.expenseId, expenseId))

  const itemsWithSplits = await Promise.all(
    items.map(async (item) => {
      const itemSplits = await db
        .select()
        .from(expenseItemSplits)
        .where(eq(expenseItemSplits.itemId, item.id))
      return { ...item, splits: itemSplits }
    }),
  )

  const expenseReceipts = await db
    .select()
    .from(receipts)
    .where(eq(receipts.expenseId, expenseId))

  return { ...expense, payers, splits, items: itemsWithSplits, receipts: expenseReceipts }
}

export async function updateExpense(
  expenseId: string,
  data: CreateExpenseData,
  groupId?: string,
  memberId?: string,
  userId?: string,
) {
  const now = Date.now()
  const computedSplits = calculateSplits(data.amount, data.splitMethod, data.splits)

  // Look up the group for this expense to determine exchange rate
  const existing = await db
    .select({ groupId: expenses.groupId })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .then((rows) => rows[0])

  let exchangeRate: number | null = null
  if (existing) {
    const group = await db
      .select({ currency: groups.currency })
      .from(groups)
      .where(eq(groups.id, existing.groupId))
      .then((rows) => rows[0])

    if (group && data.currency !== group.currency) {
      exchangeRate = await getRate(data.currency, group.currency)
    }
  }

  const sqlite = (db as any).session?.client
  if (sqlite && typeof sqlite.run === "function") {
    sqlite.run("BEGIN")
  }
  try {
    await db
      .update(expenses)
      .set({
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        exchangeRate,
        date: data.date,
        splitMethod: data.splitMethod,
        categoryId: data.categoryId || null,
        note: data.note || null,
        updatedAt: now,
      })
      .where(eq(expenses.id, expenseId))

    // Delete old payers and splits, then recreate
    await db.delete(expensePayers).where(eq(expensePayers.expenseId, expenseId))
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId))

    for (const payer of data.payers) {
      await db.insert(expensePayers).values({
        id: nanoid(),
        expenseId,
        memberId: payer.memberId,
        amount: payer.amount,
      })
    }

    for (const split of computedSplits) {
      await db.insert(expenseSplits).values({
        id: nanoid(),
        expenseId,
        memberId: split.memberId,
        amount: split.amount,
        shares: split.shares ?? null,
      })
    }

    if (sqlite && typeof sqlite.run === "function") {
      sqlite.run("COMMIT")
    }
  } catch (e) {
    if (sqlite && typeof sqlite.run === "function") {
      sqlite.run("ROLLBACK")
    }
    throw e
  }

  const expense = await getExpenseById(expenseId)

  // Broadcast and log activity (fire-and-forget)
  if (expense && groupId && memberId) {
    wsManager.broadcast(groupId, { type: "expense:updated", groupId, expense }, userId)
    logActivity(groupId, memberId, "expense_updated", "expense", expenseId, { title: data.title, amount: data.amount }).catch(() => {})
  }

  return expense
}

export async function deleteExpense(
  expenseId: string,
  groupId?: string,
  memberId?: string,
  userId?: string,
) {
  await db.delete(expenses).where(eq(expenses.id, expenseId))

  // Broadcast and log activity (fire-and-forget)
  if (groupId && memberId) {
    wsManager.broadcast(groupId, { type: "expense:deleted", groupId, expenseId }, userId)
    logActivity(groupId, memberId, "expense_deleted", "expense", expenseId).catch(() => {})
  }
}
