<template>
  <div>
    <h3 class="text-sm font-semibold text-foreground mb-3">Split Method</h3>

    <div class="flex gap-1 p-1 bg-muted/60 rounded-xl mb-4">
      <button
        v-for="method in methods"
        :key="method.key"
        type="button"
        class="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
        :class="
          modelValue === method.key
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="emit('update:modelValue', method.key)"
      >
        {{ method.label }}
      </button>
    </div>

    <!-- Equal split -->
    <div v-if="modelValue === 'equal'" class="space-y-2">
      <label
        v-for="m in members"
        :key="m.id"
        class="flex items-center gap-3 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="isMemberIncluded(m.id)"
          class="rounded border-input text-primary focus:ring-ring"
          @change="toggleEqualMember(m.id)"
        />
        <span class="text-sm text-foreground flex-1">{{ m.name }}</span>
        <span class="text-xs text-muted-foreground">
          {{ equalShareDisplay }}
        </span>
      </label>
      <p class="text-xs text-muted-foreground">
        {{ equalSelectedCount }} member{{ equalSelectedCount !== 1 ? "s" : "" }} selected
      </p>
    </div>

    <!-- Percentage split -->
    <div v-else-if="modelValue === 'percentage'" class="space-y-2">
      <div
        v-for="m in members"
        :key="m.id"
        class="flex items-center gap-3"
      >
        <span class="text-sm text-foreground w-28 truncate">{{ m.name }}</span>
        <div class="flex-1 flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            :value="getSplitValue(m.id, 'percentage')"
            class="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="0"
            @input="onPercentageChange(m.id, $event)"
          />
          <span class="text-sm text-muted-foreground shrink-0">%</span>
        </div>
        <span class="text-xs text-muted-foreground w-20 text-right">
          {{ memberAmountDisplay(m.id, "percentage") }}
        </span>
      </div>
      <div class="text-xs" :class="percentageStatusClass">
        {{ percentageStatusLabel }}
      </div>
    </div>

    <!-- Amount split -->
    <div v-else-if="modelValue === 'amount'" class="space-y-2">
      <div
        v-for="m in members"
        :key="m.id"
        class="flex items-center gap-3"
      >
        <span class="text-sm text-foreground w-28 truncate">{{ m.name }}</span>
        <input
          type="number"
          min="0"
          step="0.01"
          :value="getSplitValue(m.id, 'amount')"
          class="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          placeholder="0.00"
          @input="onAmountChange(m.id, $event)"
        />
      </div>
      <div class="text-xs" :class="amountStatusClass">
        {{ amountStatusLabel }}
      </div>
    </div>

    <!-- Shares split -->
    <div v-else-if="modelValue === 'shares'" class="space-y-2">
      <div
        v-for="m in members"
        :key="m.id"
        class="flex items-center gap-3"
      >
        <span class="text-sm text-foreground w-28 truncate">{{ m.name }}</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-border text-foreground flex items-center justify-center hover:bg-accent transition-colors"
            @click="adjustShares(m.id, -1)"
          >
            -
          </button>
          <span class="w-8 text-center text-sm font-medium text-foreground">
            {{ getShares(m.id) }}
          </span>
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-border text-foreground flex items-center justify-center hover:bg-accent transition-colors"
            @click="adjustShares(m.id, 1)"
          >
            +
          </button>
        </div>
        <span class="text-xs text-muted-foreground flex-1 text-right">
          {{ shareAmountDisplay(m.id) }}
        </span>
      </div>
      <p class="text-xs text-muted-foreground">
        Total: {{ totalShares }} share{{ totalShares !== 1 ? "s" : "" }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { SplitMethod, GroupMember } from "@kiekskoloj/shared"
import { formatCurrency } from "@kiekskoloj/shared"

interface SplitEntry {
  memberId: string
  amount: number
  shares: number | null
  /** Only used internally for percentage input tracking */
  percentage?: number
}

const props = defineProps<{
  modelValue: SplitMethod
  members: GroupMember[]
  amount: number
  currency: string
  splits: SplitEntry[]
}>()

const emit = defineEmits<{
  "update:modelValue": [value: SplitMethod]
  "update:splits": [value: SplitEntry[]]
}>()

const methods = [
  { key: "equal" as const, label: "Equal" },
  { key: "percentage" as const, label: "Percentage" },
  { key: "amount" as const, label: "Amount" },
  { key: "shares" as const, label: "Shares" },
]

// ---- Equal ----

const equalSelectedCount = computed(
  () => props.splits.filter((s) => s.amount > 0).length,
)

const equalShareDisplay = computed(() => {
  const count = equalSelectedCount.value
  if (count === 0 || props.amount === 0) return formatCurrency(0, props.currency)
  return formatCurrency(props.amount / count / 100, props.currency)
})

function isMemberIncluded(memberId: string): boolean {
  return props.splits.some((s) => s.memberId === memberId && s.amount > 0)
}

function toggleEqualMember(memberId: string) {
  const included = isMemberIncluded(memberId)
  let updated: SplitEntry[]
  if (included) {
    updated = props.splits.filter((s) => s.memberId !== memberId)
  } else {
    updated = [...props.splits, { memberId, amount: 0, shares: null }]
  }
  // Recalculate equal amounts
  const count = updated.length
  if (count > 0 && props.amount > 0) {
    const share = Math.floor(props.amount / count)
    const remainder = props.amount - share * count
    updated = updated.map((s, i) => ({
      ...s,
      amount: share + (i < remainder ? 1 : 0),
    }))
  }
  emit("update:splits", updated)
}

// ---- Percentage ----

function getSplitValue(memberId: string, mode: "percentage" | "amount"): string {
  const entry = props.splits.find((s) => s.memberId === memberId)
  if (!entry) return ""
  if (mode === "percentage") {
    const pct = entry.percentage ?? (props.amount > 0 ? (entry.amount / props.amount) * 100 : 0)
    return pct > 0 ? pct.toString() : ""
  }
  return entry.amount > 0 ? (entry.amount / 100).toFixed(2) : ""
}

function memberAmountDisplay(memberId: string, mode: "percentage"): string {
  const entry = props.splits.find((s) => s.memberId === memberId)
  if (!entry) return formatCurrency(0, props.currency)
  if (mode === "percentage") {
    const pct = entry.percentage ?? 0
    return formatCurrency((props.amount * pct) / 100 / 100, props.currency)
  }
  return formatCurrency(entry.amount / 100, props.currency)
}

function onPercentageChange(memberId: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value) || 0
  const updated = props.splits.filter((s) => s.memberId !== memberId)
  const amountCents = Math.round((props.amount * val) / 100)
  updated.push({
    memberId,
    amount: amountCents,
    shares: null,
    percentage: val,
  })
  // Ensure all members are represented
  for (const m of props.members) {
    if (!updated.find((s) => s.memberId === m.id)) {
      updated.push({ memberId: m.id, amount: 0, shares: null, percentage: 0 })
    }
  }
  emit("update:splits", updated)
}

const percentageTotal = computed(() =>
  props.splits.reduce((sum, s) => sum + (s.percentage ?? (props.amount > 0 ? (s.amount / props.amount) * 100 : 0)), 0),
)

const percentageStatusLabel = computed(() => {
  const total = Math.round(percentageTotal.value * 10) / 10
  if (total === 100) return "100% allocated"
  const diff = Math.round((100 - total) * 10) / 10
  return diff > 0 ? `${diff}% remaining` : `${Math.abs(diff)}% over`
})

const percentageStatusClass = computed(() =>
  Math.abs(Math.round(percentageTotal.value * 10) / 10 - 100) < 0.01
    ? "text-muted-foreground"
    : "text-destructive",
)

// ---- Amount ----

function onAmountChange(memberId: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value) || 0
  const amountCents = Math.round(val * 100)
  const updated = props.splits.filter((s) => s.memberId !== memberId)
  updated.push({ memberId, amount: amountCents, shares: null })
  for (const m of props.members) {
    if (!updated.find((s) => s.memberId === m.id)) {
      updated.push({ memberId: m.id, amount: 0, shares: null })
    }
  }
  emit("update:splits", updated)
}

const amountTotal = computed(() =>
  props.splits.reduce((sum, s) => sum + s.amount, 0),
)

const amountStatusLabel = computed(() => {
  if (amountTotal.value === props.amount) return "Fully allocated"
  const diff = props.amount - amountTotal.value
  const display = formatCurrency(Math.abs(diff) / 100, props.currency)
  return diff > 0 ? `${display} remaining` : `${display} over`
})

const amountStatusClass = computed(() =>
  amountTotal.value === props.amount
    ? "text-muted-foreground"
    : "text-destructive",
)

// ---- Shares ----

function getShares(memberId: string): number {
  const entry = props.splits.find((s) => s.memberId === memberId)
  return entry?.shares ?? 0
}

function adjustShares(memberId: string, delta: number) {
  const updated = [...props.splits]
  const idx = updated.findIndex((s) => s.memberId === memberId)
  if (idx !== -1) {
    const newShares = Math.max(0, (updated[idx].shares ?? 0) + delta)
    updated[idx] = { ...updated[idx], shares: newShares }
  } else {
    updated.push({ memberId, amount: 0, shares: Math.max(0, delta) })
  }
  // Recalculate amounts based on shares
  const totalSh = updated.reduce((sum, s) => sum + (s.shares ?? 0), 0)
  if (totalSh > 0) {
    let allocated = 0
    const withAmounts = updated.map((s, i) => {
      const share = s.shares ?? 0
      let amt: number
      if (i === updated.length - 1) {
        amt = props.amount - allocated
      } else {
        amt = Math.round((props.amount * share) / totalSh)
        allocated += amt
      }
      return { ...s, amount: amt }
    })
    emit("update:splits", withAmounts)
  } else {
    emit(
      "update:splits",
      updated.map((s) => ({ ...s, amount: 0 })),
    )
  }
}

const totalShares = computed(() =>
  props.splits.reduce((sum, s) => sum + (s.shares ?? 0), 0),
)

function shareAmountDisplay(memberId: string): string {
  const entry = props.splits.find((s) => s.memberId === memberId)
  if (!entry) return formatCurrency(0, props.currency)
  return formatCurrency(entry.amount / 100, props.currency)
}
</script>
