<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold text-foreground">Who Paid</h3>
      <button
        type="button"
        class="text-xs text-primary hover:underline"
        @click="toggleMultiPayer"
      >
        {{ multiPayer ? "Single payer" : "Multiple payers" }}
      </button>
    </div>

    <div v-if="!multiPayer">
      <select
        :value="singlePayerId"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        @change="onSinglePayerChange"
      >
        <option value="" disabled>Select who paid</option>
        <option v-for="m in members" :key="m.id" :value="m.id">
          {{ m.name }}
        </option>
      </select>
    </div>

    <div v-else class="space-y-2">
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
          :value="getPayerAmount(m.id)"
          class="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="0.00"
          @input="onPayerAmountChange(m.id, $event)"
        />
      </div>
      <div class="text-xs" :class="remainingClass">
        {{ remainingLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { GroupMember } from "@kiekskoloj/shared"
import { formatCurrency } from "@kiekskoloj/shared"

interface PayerEntry {
  memberId: string
  amount: number
}

const props = defineProps<{
  modelValue: PayerEntry[]
  members: GroupMember[]
  amount: number
  currency: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: PayerEntry[]]
}>()

const multiPayer = ref(props.modelValue.length > 1)

const singlePayerId = computed(() =>
  props.modelValue.length === 1 ? props.modelValue[0].memberId : "",
)

function toggleMultiPayer() {
  multiPayer.value = !multiPayer.value
  if (!multiPayer.value && props.modelValue.length > 0) {
    const first =
      props.modelValue.find((p) => p.amount > 0) || props.modelValue[0]
    emit("update:modelValue", [
      { memberId: first.memberId, amount: props.amount },
    ])
  } else if (multiPayer.value && props.modelValue.length === 1) {
    emit("update:modelValue", [
      { memberId: props.modelValue[0].memberId, amount: props.amount },
    ])
  }
}

function onSinglePayerChange(e: Event) {
  const memberId = (e.target as HTMLSelectElement).value
  emit("update:modelValue", [{ memberId, amount: props.amount }])
}

function getPayerAmount(memberId: string): string {
  const entry = props.modelValue.find((p) => p.memberId === memberId)
  if (!entry || entry.amount === 0) return ""
  return (entry.amount / 100).toFixed(2)
}

function onPayerAmountChange(memberId: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value) || 0
  const amountCents = Math.round(val * 100)
  const updated = props.modelValue.filter((p) => p.memberId !== memberId)
  if (amountCents > 0) {
    updated.push({ memberId, amount: amountCents })
  }
  emit("update:modelValue", updated)
}

const payerTotal = computed(() =>
  props.modelValue.reduce((sum, p) => sum + p.amount, 0),
)

const remaining = computed(() => props.amount - payerTotal.value)

const remainingLabel = computed(() => {
  if (remaining.value === 0) return "Fully allocated"
  const display = formatCurrency(Math.abs(remaining.value) / 100, props.currency)
  return remaining.value > 0
    ? `${display} remaining`
    : `${display} over`
})

const remainingClass = computed(() =>
  remaining.value === 0
    ? "text-muted-foreground"
    : "text-destructive",
)

watch(
  () => props.amount,
  (newAmount) => {
    if (!multiPayer.value && props.modelValue.length === 1) {
      emit("update:modelValue", [
        { memberId: props.modelValue[0].memberId, amount: newAmount },
      ])
    }
  },
)
</script>
