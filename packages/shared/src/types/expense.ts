export type SplitMethod = 'equal' | 'percentage' | 'amount' | 'weight' | 'shares'

export interface Expense {
  id: string
  groupId: string
  title: string
  amount: number
  currency: string
  exchangeRate: number | null
  categoryId: string | null
  note: string | null
  date: number
  splitMethod: SplitMethod
  recurringId: string | null
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface ExpensePayer {
  id: string
  expenseId: string
  memberId: string
  amount: number
}

export interface ExpenseSplit {
  id: string
  expenseId: string
  memberId: string
  amount: number
  shares: number | null
}

export interface ExpenseItem {
  id: string
  expenseId: string
  name: string
  amount: number
}

export interface ExpenseItemSplit {
  id: string
  itemId: string
  memberId: string
  shares: number
}
