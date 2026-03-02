<template>
  <RouterLink
    :to="`/groups/${expense.groupId}/expenses/${expense.id}`"
    class="block rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
  >
    <div class="flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-card-foreground truncate">
          {{ expense.comment || formattedAmount }}
        </h3>
        <div class="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{{ formattedDate }}</span>
          <span v-if="paidByName">
            &middot; paid by {{ paidByName }}
          </span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="font-semibold text-card-foreground">
          {{ formattedAmount }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Expense, GroupMember } from "@kiekskoloj/shared"
import { formatCurrency } from "@kiekskoloj/shared"

const props = defineProps<{
  expense: Expense
  members?: GroupMember[]
  paidByMemberId?: string
}>()

const formattedAmount = computed(() =>
  formatCurrency(props.expense.amount / 100, props.expense.currency),
)

const formattedDate = computed(() => {
  const d = new Date(props.expense.date)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
})

const paidByName = computed(() => {
  if (!props.paidByMemberId || !props.members?.length) return null
  const member = props.members.find((m) => m.id === props.paidByMemberId)
  return member?.name || null
})
</script>
