<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 rounded-lg bg-muted/70 animate-pulse" />
      <div class="h-4 w-24 rounded-lg bg-muted/70 animate-pulse" />
      <div class="h-64 rounded-xl bg-muted/70 animate-pulse mt-6" />
    </div>

    <div v-else-if="error" class="text-center py-16">
      <p class="text-destructive mb-4">{{ error }}</p>
      <RouterLink :to="`/groups/${groupId}`" class="text-sm text-primary hover:underline">
        Back to group
      </RouterLink>
    </div>

    <div v-else>
      <div class="flex items-center gap-3 mb-6">
        <RouterLink
          :to="`/groups/${groupId}`"
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <h1 class="text-2xl font-bold">Statistics</h1>
      </div>

      <!-- Date range filter -->
      <div class="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label class="block text-xs font-medium text-muted-foreground mb-1">From</label>
          <input
            type="date"
            v-model="fromDate"
            class="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            @change="applyFilter"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted-foreground mb-1">To</label>
          <input
            type="date"
            v-model="toDate"
            class="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            @change="applyFilter"
          />
        </div>
        <button
          v-if="fromDate || toDate"
          class="text-sm text-muted-foreground hover:text-foreground transition-colors pb-1"
          @click="clearFilter"
        >
          Clear
        </button>
      </div>

      <!-- Overview cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" v-if="statsStore.stats">
        <div class="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div class="text-sm text-muted-foreground mb-1">Total Spending</div>
          <div class="text-2xl font-bold text-foreground">
            {{ formatCurrency(statsStore.stats.totalSpending, currency) }}
          </div>
        </div>
        <div class="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div class="text-sm text-muted-foreground mb-1">Expenses</div>
          <div class="text-2xl font-bold text-foreground">
            {{ statsStore.stats.expenseCount }}
          </div>
        </div>
        <div class="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div class="text-sm text-muted-foreground mb-1">Average per Expense</div>
          <div class="text-2xl font-bold text-foreground">
            {{ statsStore.stats.expenseCount > 0
              ? formatCurrency(statsStore.stats.totalSpending / statsStore.stats.expenseCount, currency)
              : formatCurrency(0, currency) }}
          </div>
        </div>
      </div>

      <!-- Spending by member -->
      <section class="mb-8" v-if="statsStore.stats && statsStore.stats.byMember.length > 0">
        <h2 class="text-lg font-semibold text-foreground mb-3">By Member</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border/60 text-muted-foreground">
                <th class="text-left py-2 pr-4 font-medium">Member</th>
                <th class="text-right py-2 px-4 font-medium">Paid</th>
                <th class="text-right py-2 pl-4 font-medium">Owed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in statsStore.stats.byMember"
                :key="m.memberId"
                class="border-b border-border/60 last:border-0"
              >
                <td class="py-2 pr-4 text-foreground">{{ m.memberName }}</td>
                <td class="py-2 px-4 text-right text-foreground">
                  {{ formatCurrency(m.paid, currency) }}
                </td>
                <td class="py-2 pl-4 text-right text-foreground">
                  {{ formatCurrency(m.owed, currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Monthly spending -->
      <section class="mb-8" v-if="statsStore.stats && statsStore.stats.byMonth.length > 0">
        <h2 class="text-lg font-semibold text-foreground mb-3">Monthly Spending</h2>
        <div class="space-y-2">
          <div
            v-for="m in statsStore.stats.byMonth"
            :key="m.month"
            class="flex items-center gap-2"
          >
            <span class="w-20 text-sm text-foreground">{{ m.month }}</span>
            <div class="flex-1 bg-muted/60 rounded-full h-3 overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all duration-500"
                :style="{ width: `${monthPercentage(m.total)}%` }"
              />
            </div>
            <span class="text-sm w-20 text-right text-muted-foreground">
              {{ formatCurrency(m.total, currency) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Export buttons -->
      <section class="flex gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground shadow-sm transition-colors"
          @click="downloadCSV"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground shadow-sm transition-colors"
          @click="downloadJSON"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export JSON
        </button>
      </section>

      <!-- Empty state -->
      <div
        v-if="statsStore.stats && statsStore.stats.expenseCount === 0"
        class="text-center py-12 text-muted-foreground"
      >
        No expenses found for the selected period.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import { formatCurrency } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"
import { useStatsStore } from "@/stores/stats"

const route = useRoute()
const groupsStore = useGroupsStore()
const statsStore = useStatsStore()

const groupId = route.params.id as string
const loading = ref(true)
const error = ref("")
const fromDate = ref("")
const toDate = ref("")

const currency = computed(() => groupsStore.currentGroup?.currency ?? "EUR")

const maxMonthTotal = computed(() => {
  if (!statsStore.stats) return 0
  return Math.max(...statsStore.stats.byMonth.map((m) => m.total), 1)
})

function monthPercentage(total: number): number {
  return (total / maxMonthTotal.value) * 100
}

function buildExportQuery(): string {
  const params = new URLSearchParams()
  if (fromDate.value) params.set("from", String(new Date(fromDate.value).getTime()))
  if (toDate.value) params.set("to", String(new Date(toDate.value + "T23:59:59").getTime()))
  return params.toString() ? `?${params}` : ""
}

function downloadCSV() {
  window.open(`/api/groups/${groupId}/export/csv${buildExportQuery()}`, "_blank")
}

function downloadJSON() {
  window.open(`/api/groups/${groupId}/export/json${buildExportQuery()}`, "_blank")
}

async function loadStats() {
  const from = fromDate.value ? new Date(fromDate.value).getTime() : undefined
  const to = toDate.value ? new Date(toDate.value + "T23:59:59").getTime() : undefined
  await statsStore.fetchStats(groupId, from, to)
}

async function applyFilter() {
  try {
    await loadStats()
  } catch (e: any) {
    error.value = e.message || "Failed to load stats"
  }
}

function clearFilter() {
  fromDate.value = ""
  toDate.value = ""
  applyFilter()
}

onMounted(async () => {
  try {
    await groupsStore.fetchGroup(groupId)
    await loadStats()
  } catch (e: any) {
    error.value = e.message || "Failed to load statistics"
  } finally {
    loading.value = false
  }
})
</script>
