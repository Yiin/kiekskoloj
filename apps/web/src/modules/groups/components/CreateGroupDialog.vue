<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="close" />
      <div class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
        <h2 class="text-lg font-semibold text-card-foreground mb-4">Create Group</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label for="group-name" class="block text-sm font-medium text-foreground mb-1">
                Group Name
              </label>
              <input
                id="group-name"
                v-model="form.name"
                type="text"
                required
                maxlength="100"
                placeholder="Trip to Japan"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label for="member-name" class="block text-sm font-medium text-foreground mb-1">
                Your Name
              </label>
              <input
                id="member-name"
                v-model="form.memberName"
                type="text"
                required
                maxlength="50"
                placeholder="Alice"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label for="group-currency" class="block text-sm font-medium text-foreground mb-1">
                Currency
              </label>
              <select
                id="group-currency"
                v-model="form.currency"
                class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
                  {{ c.symbol }} {{ c.code }} - {{ c.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-2">
                Color
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in presetColors"
                  :key="color"
                  type="button"
                  class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  :class="form.color === color ? 'border-foreground scale-110' : 'border-transparent'"
                  :style="{ backgroundColor: color }"
                  @click="form.color = color"
                />
                <label
                  class="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:border-foreground transition-colors"
                  :style="isCustomColor ? { backgroundColor: form.color, borderStyle: 'solid', borderColor: 'var(--color-foreground)' } : {}"
                >
                  <input
                    type="color"
                    class="sr-only"
                    @input="(e) => form.color = (e.target as HTMLInputElement).value"
                  />
                  <svg v-if="!isCustomColor" class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </label>
              </div>
            </div>
          </div>

          <div v-if="error" class="mt-3 text-sm text-destructive">{{ error }}</div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-xl border border-border text-foreground hover:bg-accent transition-colors"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors disabled:opacity-50 font-medium"
            >
              {{ submitting ? "Creating..." : "Create" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue"
import { CURRENCIES } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  created: [groupId: string]
}>()

const store = useGroupsStore()

const presetColors = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

const form = reactive({
  name: "",
  memberName: "",
  currency: "EUR",
  color: presetColors[4],
})

const isCustomColor = computed(() => !presetColors.includes(form.color))

const submitting = ref(false)
const error = ref("")

function close() {
  emit("close")
  form.name = ""
  form.memberName = ""
  form.currency = "EUR"
  form.color = presetColors[4]
  error.value = ""
}

async function handleSubmit() {
  if (!form.name.trim()) return
  submitting.value = true
  error.value = ""
  try {
    const group = await store.createGroup({
      name: form.name.trim(),
      memberName: form.memberName.trim(),
      currency: form.currency,
      color: form.color,
    })
    emit("created", group.id)
    close()
  } catch (e: any) {
    error.value = e.message || "Failed to create group"
  } finally {
    submitting.value = false
  }
}
</script>
