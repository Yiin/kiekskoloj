<template>
  <div>
    <div v-if="debts.length === 0" class="text-muted-foreground text-sm py-4">
      All settled up! No outstanding debts.
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="(debt, i) in debts"
        :key="i"
        class="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
      >
        <div class="flex items-center gap-2 text-sm min-w-0">
          <span class="font-medium text-foreground truncate">{{ memberNames.get(debt.from) ?? debt.from }}</span>
          <svg class="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span class="font-medium text-foreground truncate">{{ memberNames.get(debt.to) ?? debt.to }}</span>
          <span class="text-muted-foreground shrink-0">
            {{ formatCurrency(debt.amount, currency) }}
          </span>
        </div>
        <button
          class="shrink-0 ml-3 px-3 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors"
          @click="$emit('settle', debt)"
        >
          Settle
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "@kiekskoloj/shared"
import type { SimplifiedDebt } from "@/stores/settlements"

defineProps<{
  debts: SimplifiedDebt[]
  currency: string
  memberNames: Map<string, string>
}>()

defineEmits<{
  settle: [debt: SimplifiedDebt]
}>()
</script>
