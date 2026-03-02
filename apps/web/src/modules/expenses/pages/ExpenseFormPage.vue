<template>
  <div>
    <div v-if="pageLoading" class="space-y-4">
      <div class="h-8 w-48 rounded bg-muted animate-pulse" />
      <div class="h-64 rounded-lg bg-muted animate-pulse mt-6" />
    </div>

    <div v-else-if="pageError" class="text-center py-16">
      <p class="text-destructive mb-4">{{ pageError }}</p>
      <RouterLink
        :to="`/groups/${groupId}`"
        class="text-sm text-primary hover:underline"
      >
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </RouterLink>
        <h1 class="text-2xl font-bold">
          {{ isEditing ? "Edit Expense" : "New Expense" }}
        </h1>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6 max-w-lg">
        <!-- Section 1: Basic Info -->
        <section class="space-y-4">
          <div class="flex gap-4">
            <div class="flex-1">
              <label
                for="expense-amount"
                class="block text-sm font-medium text-foreground mb-1"
              >
                Amount
              </label>
              <div class="relative">
                <input
                  id="expense-amount"
                  v-model="amountInput"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors pr-14"
                />
                <span
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  {{ groupCurrency }}
                </span>
              </div>
            </div>

            <div class="w-40">
              <label
                for="expense-date"
                class="block text-sm font-medium text-foreground mb-1"
              >
                Date
              </label>
              <input
                id="expense-date"
                v-model="form.date"
                type="date"
                required
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              for="expense-comment"
              class="block text-sm font-medium text-foreground mb-1"
            >
              Comment
            </label>
            <input
              id="expense-comment"
              v-model="form.comment"
              type="text"
              maxlength="200"
              placeholder="mcd, taxi, beer..."
              class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </section>

        <!-- Section 2: Who Paid -->
        <section
          class="border border-border/60 rounded-xl p-4 bg-card shadow-sm"
        >
          <PayerSelector
            v-model="form.payers"
            :members="groupStore.members"
            :amount="amountCents"
            :currency="groupCurrency"
          />
        </section>

        <!-- Section 3: Split Method -->
        <section class="border border-border/60 rounded-xl p-4 bg-card shadow-sm">
          <SplitMethodSelector
            v-model="form.splitMethod"
            :members="groupStore.members"
            :amount="amountCents"
            :currency="groupCurrency"
            :splits="form.splits"
            @update:splits="form.splits = $event"
          />
        </section>

        <!-- Section 4: Actions -->
        <div v-if="submitError" class="text-sm text-destructive">
          {{ submitError }}
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="submitting"
            class="px-6 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors disabled:opacity-50 font-medium"
          >
            {{ submitting ? "Saving..." : isEditing ? "Update" : "Create" }}
          </button>
          <RouterLink
            :to="`/groups/${groupId}`"
            class="px-4 py-2.5 text-sm rounded-xl border border-border text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </RouterLink>
          <button
            v-if="isEditing"
            type="button"
            class="ml-auto px-4 py-2.5 text-sm rounded-xl text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            :disabled="deleting"
            @click="handleDelete"
          >
            {{ deleting ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { SplitMethod } from "@kiekskoloj/shared"
import { useExpensesStore } from "@/stores/expenses"
import { useGroupsStore } from "@/stores/groups"
import PayerSelector from "../components/PayerSelector.vue"
import SplitMethodSelector from "../components/SplitMethodSelector.vue"

const route = useRoute()
const router = useRouter()
const expensesStore = useExpensesStore()
const groupStore = useGroupsStore()

const groupId = route.params.id as string
const expenseId = route.params.expenseId as string | undefined
const isEditing = computed(() => !!expenseId)

const pageLoading = ref(true)
const pageError = ref("")
const submitting = ref(false)
const deleting = ref(false)
const submitError = ref("")

const amountInput = ref("")

const groupCurrency = computed(
  () => groupStore.currentGroup?.currency || "EUR",
)

const amountCents = computed(() =>
  Math.round((parseFloat(amountInput.value) || 0) * 100),
)

interface SplitEntry {
  memberId: string
  amount: number
  shares: number | null
  percentage?: number
}

const form = reactive({
  comment: "",
  date: new Date().toISOString().slice(0, 10),
  splitMethod: "equal" as SplitMethod,
  payers: [] as { memberId: string; amount: number }[],
  splits: [] as SplitEntry[],
})

function initSplitsForAllMembers() {
  const members = groupStore.members
  if (members.length === 0) return
  const count = members.length
  const share = count > 0 && amountCents.value > 0 ? Math.floor(amountCents.value / count) : 0
  const remainder = count > 0 && amountCents.value > 0 ? amountCents.value - share * count : 0
  form.splits = members.map((m, i) => ({
    memberId: m.id,
    amount: share + (i < remainder ? 1 : 0),
    shares: null,
  }))
}

// Re-split when amount changes and method is equal
watch(amountCents, () => {
  if (form.splitMethod === "equal") {
    const included = form.splits.filter((s) => s.amount > 0 || form.splits.length === groupStore.members.length)
    const memberIds = included.length > 0 ? included.map((s) => s.memberId) : groupStore.members.map((m) => m.id)
    const count = memberIds.length
    if (count > 0) {
      const share = Math.floor(amountCents.value / count)
      const remainder = amountCents.value - share * count
      form.splits = memberIds.map((id, i) => ({
        memberId: id,
        amount: share + (i < remainder ? 1 : 0),
        shares: null,
      }))
    }
  }
  // Update single payer amount
  if (form.payers.length === 1) {
    form.payers = [{ memberId: form.payers[0].memberId, amount: amountCents.value }]
  }
})

onMounted(async () => {
  try {
    // Make sure group data is loaded
    if (!groupStore.currentGroup || groupStore.currentGroup.id !== groupId) {
      await groupStore.fetchGroup(groupId)
    }

    if (isEditing.value && expenseId) {
      const expense = await expensesStore.fetchExpense(groupId, expenseId)
      form.comment = expense.comment || ""
      form.date = new Date(expense.date).toISOString().slice(0, 10)
      form.splitMethod = expense.splitMethod
      amountInput.value = (expense.amount / 100).toFixed(2)
      form.payers = expense.payers.map((p) => ({
        memberId: p.memberId,
        amount: p.amount,
      }))
      form.splits = expense.splits.map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shares: s.shares,
      }))
    } else {
      // Default: first member is payer, equal split among all
      if (groupStore.members.length > 0) {
        form.payers = [
          {
            memberId: groupStore.members[0].id,
            amount: amountCents.value,
          },
        ]
        initSplitsForAllMembers()
      }
    }
  } catch (e: any) {
    pageError.value = e.message || "Failed to load"
  } finally {
    pageLoading.value = false
  }
})

// When split method changes, reinitialize splits
watch(
  () => form.splitMethod,
  (method) => {
    const members = groupStore.members
    if (method === "equal") {
      initSplitsForAllMembers()
    } else if (method === "shares") {
      form.splits = members.map((m) => ({
        memberId: m.id,
        amount: Math.round(amountCents.value / members.length),
        shares: 1,
      }))
      // Fix rounding
      if (members.length > 0) {
        const total = form.splits.reduce((s, e) => s + e.amount, 0)
        form.splits[form.splits.length - 1].amount += amountCents.value - total
      }
    } else {
      form.splits = members.map((m) => ({
        memberId: m.id,
        amount: 0,
        shares: null,
        percentage: 0,
      }))
    }
  },
)

async function handleSubmit() {
  if (amountCents.value <= 0) return

  submitting.value = true
  submitError.value = ""

  const payload = {
    comment: form.comment.trim() || null,
    amount: amountCents.value,
    currency: groupCurrency.value,
    date: new Date(form.date).getTime(),
    splitMethod: form.splitMethod,
    payers: form.payers.map((p) => ({
      memberId: p.memberId,
      amount: p.amount,
    })),
    splits: form.splits
      .filter((s) => s.amount > 0 || (s.shares ?? 0) > 0)
      .map((s) => ({
        memberId: s.memberId,
        amount: s.amount,
        shares: s.shares,
      })),
  }

  try {
    if (isEditing.value && expenseId) {
      await expensesStore.updateExpense(groupId, expenseId, payload)
    } else {
      await expensesStore.createExpense(groupId, payload)
    }
    router.push(`/groups/${groupId}`)
  } catch (e: any) {
    submitError.value = e.message || "Failed to save expense"
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!expenseId || !confirm("Delete this expense?")) return
  deleting.value = true
  try {
    await expensesStore.deleteExpense(groupId, expenseId)
    router.push(`/groups/${groupId}`)
  } catch (e: any) {
    submitError.value = e.message || "Failed to delete"
  } finally {
    deleting.value = false
  }
}
</script>
