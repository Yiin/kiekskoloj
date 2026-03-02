import { db } from "../../lib/db"
import { recurringExpenses } from "../../db/schema"
import { eq, and, lte } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createExpense } from "../expenses/service"

type SplitMethod = "equal" | "percentage" | "amount" | "weight" | "shares"
type Frequency = "daily" | "weekly" | "monthly" | "yearly"

interface TemplatePayer {
  memberId: string
  amount: number
}

interface TemplateSplit {
  memberId: string
  amount?: number
  shares?: number
}

export interface RecurringTemplate {
  payers: TemplatePayer[]
  splits: TemplateSplit[]
}

interface CreateRecurringData {
  comment?: string
  amount: number
  currency: string
  splitMethod: SplitMethod
  frequency: Frequency
  nextDate: number
  template: RecurringTemplate
}

interface UpdateRecurringData {
  comment?: string | null
  amount?: number
  currency?: string
  splitMethod?: SplitMethod
  frequency?: Frequency
  nextDate?: number
  active?: boolean
  template?: RecurringTemplate
}

export function getNextDate(current: number, frequency: Frequency): number {
  const date = new Date(current)
  switch (frequency) {
    case "daily":
      date.setUTCDate(date.getUTCDate() + 1)
      break
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + 1)
      break
    case "yearly":
      date.setUTCFullYear(date.getUTCFullYear() + 1)
      break
  }
  return date.getTime()
}

export async function createRecurring(
  groupId: string,
  memberId: string,
  data: CreateRecurringData,
) {
  const id = nanoid()
  const now = Date.now()

  await db.insert(recurringExpenses).values({
    id,
    groupId,
    comment: data.comment || null,
    amount: data.amount,
    currency: data.currency,
    splitMethod: data.splitMethod,
    frequency: data.frequency,
    nextDate: data.nextDate,
    active: true,
    template: JSON.stringify(data.template),
    createdBy: memberId,
    createdAt: now,
  })

  return db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, id))
    .then((rows) => rows[0])
}

export async function getRecurring(groupId: string) {
  return db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.groupId, groupId))
}

export async function updateRecurring(recurringId: string, data: UpdateRecurringData) {
  const setValues: Record<string, unknown> = {}

  if (data.comment !== undefined) setValues.comment = data.comment
  if (data.amount !== undefined) setValues.amount = data.amount
  if (data.currency !== undefined) setValues.currency = data.currency
  if (data.splitMethod !== undefined) setValues.splitMethod = data.splitMethod
  if (data.frequency !== undefined) setValues.frequency = data.frequency
  if (data.nextDate !== undefined) setValues.nextDate = data.nextDate
  if (data.active !== undefined) setValues.active = data.active
  if (data.template !== undefined) setValues.template = JSON.stringify(data.template)

  if (Object.keys(setValues).length === 0) return null

  await db
    .update(recurringExpenses)
    .set(setValues)
    .where(eq(recurringExpenses.id, recurringId))

  return db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, recurringId))
    .then((rows) => rows[0] || null)
}

export async function deleteRecurring(recurringId: string) {
  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, recurringId))
}

export async function processDueRecurring() {
  const now = Date.now()

  const dueItems = await db
    .select()
    .from(recurringExpenses)
    .where(and(lte(recurringExpenses.nextDate, now), eq(recurringExpenses.active, true)))

  for (const item of dueItems) {
    const template: RecurringTemplate = JSON.parse(item.template)

    await createExpense(item.groupId, item.createdBy, {
      comment: item.comment || undefined,
      amount: item.amount,
      currency: item.currency,
      date: item.nextDate,
      splitMethod: item.splitMethod as SplitMethod,
      payers: template.payers,
      splits: template.splits,
    })

    const next = getNextDate(item.nextDate, item.frequency as Frequency)
    await db
      .update(recurringExpenses)
      .set({ nextDate: next })
      .where(eq(recurringExpenses.id, item.id))
  }

  return dueItems.length
}
