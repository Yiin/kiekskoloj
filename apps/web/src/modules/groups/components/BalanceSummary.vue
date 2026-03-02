<template>
  <div>
    <div v-if="sortedBalances.length === 0" class="text-muted-foreground text-sm">
      No balances to show.
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="b in sortedBalances"
        :key="b.memberId"
        class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div
            class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0"
          >
            {{ b.memberName.charAt(0).toUpperCase() }}
          </div>
          <span class="truncate text-sm text-foreground">{{ b.memberName }}</span>
        </div>
        <span
          class="text-sm font-medium shrink-0"
          :class="balanceColor(b.balance)"
        >
          {{ balanceLabel(b.balance) }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatCurrency } from "@kiekskoloj/shared"
import type { Balance } from "@/stores/settlements"

const props = defineProps<{
  balances: Balance[]
  currency: string
}>()

const sortedBalances = computed(() => {
  return [...props.balances].sort((a, b) => b.balance - a.balance)
})

function balanceColor(balance: number): string {
  if (balance > 0.01) return "text-green-600"
  if (balance < -0.01) return "text-destructive"
  return "text-muted-foreground"
}

function balanceLabel(balance: number): string {
  const abs = Math.abs(balance)
  const formatted = formatCurrency(abs, props.currency)
  if (balance > 0.01) return `+${formatted}`
  if (balance < -0.01) return `-${formatted}`
  return formatted
}
</script>
