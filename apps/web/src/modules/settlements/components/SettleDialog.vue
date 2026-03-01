<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="fixed inset-0 bg-black/50" @click="close" />
      <div class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 class="text-lg font-semibold text-card-foreground mb-4">Record Settlement</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">From</label>
              <div class="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {{ fromName }}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-1">To</label>
              <div class="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {{ toName }}
              </div>
            </div>

            <div>
              <label for="settle-amount" class="block text-sm font-medium text-foreground mb-1">
                Amount ({{ currency }})
              </label>
              <input
                id="settle-amount"
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label for="settle-date" class="block text-sm font-medium text-foreground mb-1">
                Date
              </label>
              <input
                id="settle-date"
                v-model="form.dateStr"
                type="date"
                required
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label for="settle-note" class="block text-sm font-medium text-foreground mb-1">
                Note (optional)
              </label>
              <input
                id="settle-note"
                v-model="form.note"
                type="text"
                maxlength="200"
                placeholder="e.g. Bank transfer"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-accent"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {{ submitting ? "Recording..." : "Record Settlement" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue"
import { useSettlementsStore } from "@/stores/settlements"
import type { SimplifiedDebt } from "@/stores/settlements"

const props = defineProps<{
  open: boolean
  debt: SimplifiedDebt | null
  groupId: string
  currency: string
  memberNames: Map<string, string>
}>()

const emit = defineEmits<{
  close: []
  settled: []
}>()

const store = useSettlementsStore()

const form = reactive({
  amount: 0,
  dateStr: todayStr(),
  note: "",
})

const submitting = ref(false)
const error = ref("")

const fromName = ref("")
const toName = ref("")

watch(
  () => props.debt,
  (debt) => {
    if (debt) {
      form.amount = debt.amount
      form.dateStr = todayStr()
      form.note = ""
      fromName.value = props.memberNames.get(debt.from) ?? debt.from
      toName.value = props.memberNames.get(debt.to) ?? debt.to
    }
  },
)

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function close() {
  emit("close")
  error.value = ""
}

async function handleSubmit() {
  if (!props.debt || form.amount <= 0) return
  submitting.value = true
  error.value = ""
  try {
    await store.createSettlement(props.groupId, {
      fromId: props.debt.from,
      toId: props.debt.to,
      amount: form.amount,
      currency: props.currency,
      date: new Date(form.dateStr).getTime(),
      note: form.note.trim() || undefined,
    })
    emit("settled")
    close()
  } catch (e: any) {
    error.value = e.message || "Failed to record settlement"
  } finally {
    submitting.value = false
  }
}
</script>
