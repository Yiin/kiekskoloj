import { db } from "../../lib/db"
import {
  expenses,
  expensePayers,
  expenseSplits,
  groupMembers,
  settlements,
  groups,
} from "../../db/schema"
import { eq, and, gte, lte, desc } from "drizzle-orm"

function formatDateYMD(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportCSV(
  groupId: string,
  from?: number,
  to?: number,
): Promise<string> {
  const conditions = [eq(expenses.groupId, groupId)]
  if (from) conditions.push(gte(expenses.date, from))
  if (to) conditions.push(lte(expenses.date, to))
  const where = conditions.length === 1 ? conditions[0] : and(...conditions)!

  const rows = await db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.date))

  // Pre-fetch all members for name lookups
  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  const lines: string[] = []
  lines.push("Date,Comment,Amount,Currency,Paid By")

  for (const expense of rows) {
    const payers = await db
      .select()
      .from(expensePayers)
      .where(eq(expensePayers.expenseId, expense.id))

    const payerNames = payers
      .map((p) => memberMap.get(p.memberId) ?? p.memberId)
      .join("; ")

    const cols = [
      formatDateYMD(expense.date),
      escapeCSV(expense.comment ?? ""),
      String(expense.amount),
      expense.currency,
      escapeCSV(payerNames),
    ]
    lines.push(cols.join(","))
  }

  return lines.join("\n")
}

export async function exportJSON(
  groupId: string,
  from?: number,
  to?: number,
): Promise<object> {
  const conditions = [eq(expenses.groupId, groupId)]
  if (from) conditions.push(gte(expenses.date, from))
  if (to) conditions.push(lte(expenses.date, to))
  const where = conditions.length === 1 ? conditions[0] : and(...conditions)!

  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .then((rows) => rows[0])

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.date))

  const expensesWithDetails = await Promise.all(
    expenseRows.map(async (expense) => {
      const payers = await db
        .select()
        .from(expensePayers)
        .where(eq(expensePayers.expenseId, expense.id))

      const splits = await db
        .select()
        .from(expenseSplits)
        .where(eq(expenseSplits.expenseId, expense.id))

      return { ...expense, payers, splits }
    }),
  )

  const settlementRows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.date))

  return {
    group,
    members,
    expenses: expensesWithDetails,
    settlements: settlementRows,
  }
}
