import { defineStore } from "pinia"
import { ref } from "vue"
import { useApi } from "@/composables/useApi"

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
  byMember: MemberStat[]
  byMonth: MonthlyStat[]
}

export const useStatsStore = defineStore("stats", () => {
  const stats = ref<GroupStats | null>(null)
  const api = useApi()

  async function fetchStats(groupId: string, from?: number, to?: number) {
    const params = new URLSearchParams()
    if (from) params.set("from", String(from))
    if (to) params.set("to", String(to))
    const query = params.toString() ? `?${params}` : ""
    stats.value = await api.get<GroupStats>(`/groups/${groupId}/stats${query}`)
  }

  return { stats, fetchStats }
})
