import { db } from "../../lib/db"
import {
  expenses,
  expensePayers,
  expenseSplits,
  categories,
  groupMembers,
} from "../../db/schema"
import { eq, and, gte, lte, sql } from "drizzle-orm"

interface CategoryStat {
  categoryId: string | null
  categoryName: string
  total: number
  count: number
}

interface MemberStat {
  memberId: string
  memberName: string
  paid: number
  owed: number
}

interface MonthlyStat {
  month: string
  total: number
}

export interface GroupStats {
  totalSpending: number
  expenseCount: number
  byCategory: CategoryStat[]
  byMember: MemberStat[]
  byMonth: MonthlyStat[]
}

export async function getGroupStats(
  groupId: string,
  from?: number,
  to?: number,
): Promise<GroupStats> {
  const conditions = [eq(expenses.groupId, groupId)]
  if (from) conditions.push(gte(expenses.date, from))
  if (to) conditions.push(lte(expenses.date, to))
  const where = conditions.length === 1 ? conditions[0] : and(...conditions)!

  // Total spending and count
  const totalsRow = await db
    .select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.as("total"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(expenses)
    .where(where)
    .then((rows) => rows[0])

  const totalSpending = totalsRow.total
  const expenseCount = totalsRow.count

  // Spending by category
  const categoryRows = await db
    .select({
      categoryId: expenses.categoryId,
      categoryName: sql<string>`coalesce(${categories.name}, 'Uncategorized')`.as("category_name"),
      total: sql<number>`sum(${expenses.amount})`.as("total"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(where)
    .groupBy(expenses.categoryId)

  const byCategory: CategoryStat[] = categoryRows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    total: r.total,
    count: r.count,
  }))

  // Spending by member (paid via expense_payers, owed via expense_splits)
  // Build conditions for joined queries (need to filter expenses by groupId + date range)
  const paidRows = await db
    .select({
      memberId: expensePayers.memberId,
      total: sql<number>`sum(${expensePayers.amount})`.as("total"),
    })
    .from(expensePayers)
    .innerJoin(expenses, eq(expenses.id, expensePayers.expenseId))
    .where(where)
    .groupBy(expensePayers.memberId)

  const owedRows = await db
    .select({
      memberId: expenseSplits.memberId,
      total: sql<number>`sum(${expenseSplits.amount})`.as("total"),
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
    .where(where)
    .groupBy(expenseSplits.memberId)

  const members = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))

  const paidMap = new Map(paidRows.map((r) => [r.memberId, r.total]))
  const owedMap = new Map(owedRows.map((r) => [r.memberId, r.total]))

  const byMember: MemberStat[] = members
    .filter((m) => paidMap.has(m.id) || owedMap.has(m.id))
    .map((m) => ({
      memberId: m.id,
      memberName: m.name,
      paid: Math.round((paidMap.get(m.id) ?? 0) * 100) / 100,
      owed: Math.round((owedMap.get(m.id) ?? 0) * 100) / 100,
    }))

  // Monthly aggregation: group by year-month derived from date timestamp
  // SQLite strftime works on seconds, but our dates are milliseconds
  const monthlyRows = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${expenses.date} / 1000, 'unixepoch')`.as("month"),
      total: sql<number>`sum(${expenses.amount})`.as("total"),
    })
    .from(expenses)
    .where(where)
    .groupBy(sql`strftime('%Y-%m', ${expenses.date} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${expenses.date} / 1000, 'unixepoch')`)

  const byMonth: MonthlyStat[] = monthlyRows.map((r) => ({
    month: r.month,
    total: r.total,
  }))

  return { totalSpending, expenseCount, byCategory, byMember, byMonth }
}
