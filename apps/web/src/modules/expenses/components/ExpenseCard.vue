<template>
  <RouterLink
    :to="`/groups/${expense.groupId}/expenses/${expense.id}`"
    class="block rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm shrink-0"
        :style="{ backgroundColor: category?.color || '#6b7280' }"
      >
        {{ categoryIcon }}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-card-foreground truncate">
          {{ expense.title }}
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
import { DEFAULT_CATEGORIES, formatCurrency } from "@kiekskoloj/shared"

const props = defineProps<{
  expense: Expense
  members?: GroupMember[]
  paidByMemberId?: string
}>()

const category = computed(() =>
  DEFAULT_CATEGORIES.find((c) => c.name === props.expense.categoryId),
)

const categoryIconMap: Record<string, string> = {
  utensils: "\uD83C\uDF7D",
  "shopping-cart": "\uD83D\uDED2",
  car: "\uD83D\uDE97",
  film: "\uD83C\uDFAC",
  "shopping-bag": "\uD83D\uDECD",
  home: "\uD83C\uDFE0",
  zap: "\u26A1",
  heart: "\u2764",
  plane: "\u2708",
  repeat: "\uD83D\uDD01",
  gift: "\uD83C\uDF81",
  book: "\uD83D\uDCDA",
  activity: "\u26BD",
  "more-horizontal": "\u2022\u2022\u2022",
}

const categoryIcon = computed(() => {
  if (!category.value) return "\u2022\u2022\u2022"
  return categoryIconMap[category.value.icon] || category.value.icon.charAt(0).toUpperCase()
})

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
