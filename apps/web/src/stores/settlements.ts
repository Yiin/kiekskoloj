import { defineStore } from "pinia"
import { ref } from "vue"
import type { Settlement } from "@kiekskoloj/shared"
import { useApi } from "@/composables/useApi"

export interface Balance {
  memberId: string
  memberName: string
  balance: number
}

export interface SimplifiedDebt {
  from: string
  to: string
  amount: number
}

export const useSettlementsStore = defineStore("settlements", () => {
  const settlements = ref<Settlement[]>([])
  const balances = ref<Balance[]>([])
  const debts = ref<SimplifiedDebt[]>([])
  const api = useApi()

  async function fetchBalances(groupId: string) {
    const res = await api.get<{ balances: Balance[]; debts: SimplifiedDebt[] }>(
      `/groups/${groupId}/balances`,
    )
    balances.value = res.balances
    debts.value = res.debts
  }

  async function fetchSettlements(groupId: string) {
    const res = await api.get<{ settlements: Settlement[] }>(
      `/groups/${groupId}/settlements`,
    )
    settlements.value = res.settlements
  }

  async function createSettlement(
    groupId: string,
    data: {
      fromId: string
      toId: string
      amount: number
      currency: string
      date: number
      note?: string
    },
  ) {
    const res = await api.post<{ settlement: Settlement }>(
      `/groups/${groupId}/settlements`,
      data,
    )
    settlements.value.unshift(res.settlement)
    await fetchBalances(groupId)
    return res.settlement
  }

  async function deleteSettlement(groupId: string, settlementId: string) {
    await api.del(`/groups/${groupId}/settlements/${settlementId}`)
    settlements.value = settlements.value.filter((s) => s.id !== settlementId)
    await fetchBalances(groupId)
  }

  return {
    settlements,
    balances,
    debts,
    fetchBalances,
    fetchSettlements,
    createSettlement,
    deleteSettlement,
  }
})
