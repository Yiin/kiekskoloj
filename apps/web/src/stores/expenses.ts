import { defineStore } from "pinia"
import { ref } from "vue"
import type { Expense, ExpensePayer, ExpenseSplit } from "@kiekskoloj/shared"
import { useApi } from "@/composables/useApi"

export const useExpensesStore = defineStore("expenses", () => {
  const expenses = ref<Expense[]>([])
  const currentExpense = ref<
    (Expense & { payers: ExpensePayer[]; splits: ExpenseSplit[] }) | null
  >(null)
  const total = ref(0)
  const api = useApi()

  async function fetchExpenses(
    groupId: string,
    options?: { page?: number; limit?: number },
  ) {
    const params = new URLSearchParams()
    if (options?.page) params.set("page", String(options.page))
    if (options?.limit) params.set("limit", String(options.limit))
    const query = params.toString() ? `?${params}` : ""
    const res = await api.get<{ expenses: Expense[]; total: number }>(
      `/groups/${groupId}/expenses${query}`,
    )
    if (options?.page && options.page > 1) {
      expenses.value.push(...res.expenses)
    } else {
      expenses.value = res.expenses
    }
    total.value = res.total
  }

  async function fetchExpense(groupId: string, expenseId: string) {
    const res = await api.get<{
      expense: Expense & { payers: ExpensePayer[]; splits: ExpenseSplit[] }
    }>(`/groups/${groupId}/expenses/${expenseId}`)
    currentExpense.value = res.expense
    return res.expense
  }

  async function createExpense(groupId: string, data: any) {
    const res = await api.post<{ expense: Expense }>(
      `/groups/${groupId}/expenses`,
      data,
    )
    expenses.value.unshift(res.expense)
    total.value++
    return res.expense
  }

  async function updateExpense(
    groupId: string,
    expenseId: string,
    data: any,
  ) {
    const res = await api.put<{ expense: Expense }>(
      `/groups/${groupId}/expenses/${expenseId}`,
      data,
    )
    const idx = expenses.value.findIndex((e) => e.id === expenseId)
    if (idx !== -1) {
      expenses.value[idx] = res.expense
    }
    return res.expense
  }

  async function deleteExpense(groupId: string, expenseId: string) {
    await api.del(`/groups/${groupId}/expenses/${expenseId}`)
    expenses.value = expenses.value.filter((e) => e.id !== expenseId)
    total.value--
  }

  return {
    expenses,
    currentExpense,
    total,
    fetchExpenses,
    fetchExpense,
    createExpense,
    updateExpense,
    deleteExpense,
  }
})
