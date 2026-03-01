<template>
  <div>
    <div v-if="loading && expenses.length === 0" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
    </div>

    <div v-else-if="expenses.length === 0" class="text-center py-12">
      <svg
        class="mx-auto w-12 h-12 text-muted-foreground mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-muted-foreground mb-4">
        No expenses yet. Add one to start tracking.
      </p>
      <RouterLink
        :to="`/groups/${groupId}/expenses/new`"
        class="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm"
      >
        Add first expense
      </RouterLink>
    </div>

    <div v-else class="space-y-3">
      <ExpenseCard
        v-for="expense in expenses"
        :key="expense.id"
        :expense="expense"
        :members="groupStore.members"
      />

      <div v-if="hasMore" class="flex justify-center pt-4">
        <button
          class="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-accent disabled:opacity-50"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? "Loading..." : "Load more" }}
        </button>
      </div>
    </div>

    <RouterLink
      :to="`/groups/${groupId}/expenses/new`"
      class="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useExpensesStore } from "@/stores/expenses"
import { useGroupsStore } from "@/stores/groups"
import ExpenseCard from "../components/ExpenseCard.vue"

const props = defineProps<{
  groupId: string
}>()

const expensesStore = useExpensesStore()
const groupStore = useGroupsStore()

const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const limit = 20

const expenses = computed(() => expensesStore.expenses)
const hasMore = computed(() => expenses.value.length < expensesStore.total)

onMounted(async () => {
  try {
    await expensesStore.fetchExpenses(props.groupId, { page: 1, limit })
  } finally {
    loading.value = false
  }
})

async function loadMore() {
  loadingMore.value = true
  try {
    page.value++
    await expensesStore.fetchExpenses(props.groupId, {
      page: page.value,
      limit,
    })
  } finally {
    loadingMore.value = false
  }
}
</script>
