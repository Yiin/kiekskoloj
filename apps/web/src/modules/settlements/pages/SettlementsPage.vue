<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 rounded bg-muted animate-pulse" />
      <div class="h-4 w-24 rounded bg-muted animate-pulse" />
      <div class="h-64 rounded-lg bg-muted animate-pulse mt-6" />
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
        <h1 class="text-2xl font-bold">Settlements</h1>
      </div>

      <section class="mb-8">
        <h2 class="text-lg font-semibold text-foreground mb-3">Current Debts</h2>
        <DebtList
          :debts="settlementsStore.debts"
          :currency="currency"
          :member-names="memberNames"
          @settle="openSettle"
        />
      </section>

      <section>
        <h2 class="text-lg font-semibold text-foreground mb-3">Settlement History</h2>
        <div v-if="settlementsStore.settlements.length === 0" class="text-muted-foreground text-sm py-4">
          No settlements recorded yet.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="s in settlementsStore.settlements"
            :key="s.id"
            class="flex items-center justify-between rounded-md border border-border px-4 py-3"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-sm">
                <span class="font-medium text-foreground truncate">{{ memberNames.get(s.fromId) ?? s.fromId }}</span>
                <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span class="font-medium text-foreground truncate">{{ memberNames.get(s.toId) ?? s.toId }}</span>
                <span class="text-muted-foreground shrink-0">
                  {{ formatCurrency(s.amount, currency) }}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{{ formatDate(s.date) }}</span>
                <span v-if="s.note" class="truncate">{{ s.note }}</span>
              </div>
            </div>
            <button
              class="shrink-0 ml-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete settlement"
              @click="handleDelete(s.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </li>
        </ul>
      </section>

      <SettleDialog
        :open="settleDialogOpen"
        :debt="selectedDebt"
        :group-id="groupId"
        :currency="currency"
        :member-names="memberNames"
        @close="settleDialogOpen = false"
        @settled="handleSettled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import { formatCurrency } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"
import { useSettlementsStore } from "@/stores/settlements"
import type { SimplifiedDebt } from "@/stores/settlements"
import DebtList from "../components/DebtList.vue"
import SettleDialog from "../components/SettleDialog.vue"

const route = useRoute()
const groupsStore = useGroupsStore()
const settlementsStore = useSettlementsStore()

const groupId = route.params.id as string
const loading = ref(true)
const error = ref("")

const settleDialogOpen = ref(false)
const selectedDebt = ref<SimplifiedDebt | null>(null)

const currency = computed(() => groupsStore.currentGroup?.currency ?? "EUR")

const memberNames = computed(() => {
  return new Map(groupsStore.members.map((m) => [m.id, m.name]))
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function openSettle(debt: SimplifiedDebt) {
  selectedDebt.value = debt
  settleDialogOpen.value = true
}

async function handleSettled() {
  await settlementsStore.fetchSettlements(groupId)
}

async function handleDelete(settlementId: string) {
  try {
    await settlementsStore.deleteSettlement(groupId, settlementId)
  } catch (e: any) {
    error.value = e.message || "Failed to delete settlement"
  }
}

onMounted(async () => {
  try {
    await groupsStore.fetchGroup(groupId)
    await Promise.all([
      settlementsStore.fetchBalances(groupId),
      settlementsStore.fetchSettlements(groupId),
    ])
  } catch (e: any) {
    error.value = e.message || "Failed to load settlements"
  } finally {
    loading.value = false
  }
})
</script>
