<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 rounded-lg bg-muted/70 animate-pulse" />
      <div class="h-4 w-24 rounded-lg bg-muted/70 animate-pulse" />
      <div class="h-64 rounded-xl bg-muted/70 animate-pulse mt-6" />
    </div>

    <div v-else-if="error" class="text-center py-16">
      <p class="text-destructive mb-4">{{ error }}</p>
      <RouterLink to="/" class="text-sm text-primary hover:underline">Back to groups</RouterLink>
    </div>

    <div v-else-if="store.currentGroup">
      <div class="flex items-center gap-3 mb-1">
        <RouterLink to="/" class="text-muted-foreground hover:text-foreground transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <div
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: store.currentGroup.color || '#9ca3af' }"
        />
        <h1 class="text-2xl font-bold">{{ store.currentGroup.name }}</h1>
        <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg font-medium">
          {{ store.currentGroup.currency }}
        </span>
      </div>

      <nav class="flex gap-1 mt-6 mb-6">
        <div class="flex gap-1 p-1 bg-muted/60 rounded-xl">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
            :class="activeTab === tab.key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <RouterLink
          :to="`/groups/${store.currentGroup.id}/settings`"
          class="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto self-center"
        >
          Settings
        </RouterLink>
      </nav>

      <div class="flex gap-8">
        <div class="flex-1 min-w-0">
          <div v-if="activeTab === 'expenses'">
            <ExpenseListPage :group-id="store.currentGroup.id" />
          </div>
          <div v-else-if="activeTab === 'balances'">
            <div v-if="balancesLoading" class="h-32 rounded-xl bg-muted/70 animate-pulse" />
            <template v-else>
              <BalanceSummary
                :balances="settlementsStore.balances"
                :currency="store.currentGroup?.currency ?? 'EUR'"
              />
              <RouterLink
                :to="`/groups/${store.currentGroup?.id}/settlements`"
                class="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
              >
                View settlements
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </RouterLink>
            </template>
          </div>
        </div>

        <aside class="w-56 shrink-0 hidden lg:block">
          <h3 class="text-sm font-semibold text-foreground mb-3">
            Members ({{ store.members.length }})
          </h3>
          <ul class="space-y-2">
            <li
              v-for="member in store.members"
              :key="member.id"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {{ member.name.charAt(0).toUpperCase() }}
                </div>
                <span class="truncate text-foreground">{{ member.name }}</span>
              </div>
              <span
                v-if="!member.active"
                class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0"
              >
                inactive
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useGroupsStore } from "@/stores/groups"
import { useSettlementsStore } from "@/stores/settlements"
import BalanceSummary from "../components/BalanceSummary.vue"
import ExpenseListPage from "@/modules/expenses/pages/ExpenseListPage.vue"

const route = useRoute()
const store = useGroupsStore()
const settlementsStore = useSettlementsStore()

const loading = ref(true)
const error = ref("")
const balancesLoading = ref(false)
const activeTab = ref<"expenses" | "balances">("expenses")

const tabs = [
  { key: "expenses" as const, label: "Expenses" },
  { key: "balances" as const, label: "Balances" },
]

watch(activeTab, async (tab) => {
  if (tab === "balances" && settlementsStore.balances.length === 0) {
    balancesLoading.value = true
    try {
      await settlementsStore.fetchBalances(route.params.id as string)
    } catch (e: any) {
      error.value = e.message || "Failed to load balances"
    } finally {
      balancesLoading.value = false
    }
  }
})

onMounted(async () => {
  try {
    await store.fetchGroup(route.params.id as string)
  } catch (e: any) {
    error.value = e.message || "Failed to load group"
  } finally {
    loading.value = false
  }
})
</script>
