<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-8 w-48 rounded bg-muted animate-pulse" />
      <div class="h-64 rounded-lg bg-muted animate-pulse mt-6" />
    </div>

    <div v-else-if="error" class="text-center py-16">
      <p class="text-destructive mb-4">{{ error }}</p>
      <RouterLink to="/" class="text-sm text-primary hover:underline">Back to groups</RouterLink>
    </div>

    <div v-else-if="store.currentGroup">
      <div class="flex items-center gap-3 mb-6">
        <RouterLink
          :to="`/groups/${store.currentGroup.id}`"
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <h1 class="text-2xl font-bold">Group Settings</h1>
      </div>

      <!-- Edit group info -->
      <section class="rounded-lg border border-border bg-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">General</h2>
        <form @submit.prevent="handleUpdateGroup" class="space-y-4 max-w-md">
          <div>
            <label for="settings-name" class="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              id="settings-name"
              v-model="groupForm.name"
              type="text"
              required
              maxlength="100"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label for="settings-currency" class="block text-sm font-medium text-foreground mb-1">Currency</label>
            <select
              id="settings-currency"
              v-model="groupForm.currency"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
                {{ c.symbol }} {{ c.code }} - {{ c.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Color</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                :class="groupForm.color === color ? 'border-foreground scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
                @click="groupForm.color = color"
              />
              <label
                class="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:border-foreground transition-colors"
                :style="isCustomColor ? { backgroundColor: groupForm.color, borderStyle: 'solid', borderColor: 'var(--color-foreground)' } : {}"
              >
                <input
                  type="color"
                  class="sr-only"
                  @input="(e) => groupForm.color = (e.target as HTMLInputElement).value"
                />
                <svg v-if="!isCustomColor" class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </label>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="submit"
              :disabled="savingGroup"
              class="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {{ savingGroup ? "Saving..." : "Save changes" }}
            </button>
            <span v-if="groupSaved" class="text-sm text-green-600">Saved</span>
          </div>
        </form>
      </section>

      <!-- Members -->
      <section class="rounded-lg border border-border bg-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Members</h2>

        <ul class="divide-y divide-border mb-4">
          <li
            v-for="member in store.members"
            :key="member.id"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                {{ member.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-foreground truncate">{{ member.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ member.role }} &middot; weight {{ member.weight }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <select
                :value="member.role"
                class="text-xs rounded border border-input bg-background px-2 py-1 text-foreground"
                @change="handleUpdateMemberRole(member.id, ($event.target as HTMLSelectElement).value as 'admin' | 'member' | 'readonly')"
              >
                <option value="admin">admin</option>
                <option value="member">member</option>
                <option value="readonly">readonly</option>
              </select>
              <button
                class="text-xs text-destructive hover:underline"
                @click="handleRemoveMember(member.id, member.name)"
              >
                Remove
              </button>
            </div>
          </li>
        </ul>

        <form @submit.prevent="handleAddMember" class="flex gap-2 items-end max-w-md">
          <div class="flex-1">
            <label for="new-member-name" class="block text-sm font-medium text-foreground mb-1">Add member</label>
            <input
              id="new-member-name"
              v-model="newMemberName"
              type="text"
              placeholder="Member name"
              required
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            :disabled="addingMember"
            class="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      <!-- Invite link -->
      <section class="rounded-lg border border-border bg-card p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Invite Link</h2>
        <div v-if="store.currentGroup.inviteCode" class="flex items-center gap-2 max-w-lg">
          <input
            type="text"
            readonly
            :value="inviteUrl"
            class="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground"
          />
          <button
            class="px-3 py-2 text-sm rounded-md border border-border text-foreground hover:bg-accent"
            @click="copyInviteUrl"
          >
            {{ copied ? "Copied" : "Copy" }}
          </button>
        </div>
        <p v-else class="text-sm text-muted-foreground mb-2">No invite link generated yet.</p>
        <button
          class="mt-3 text-sm text-primary hover:underline"
          :disabled="regenerating"
          @click="handleRegenerateInvite"
        >
          {{ store.currentGroup.inviteCode ? "Regenerate" : "Generate invite link" }}
        </button>
      </section>

      <!-- Archive / Delete -->
      <section class="rounded-lg border border-border bg-card p-6">
        <h2 class="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-foreground">Archive group</p>
              <p class="text-xs text-muted-foreground">Archived groups are hidden from the main list.</p>
            </div>
            <button
              class="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-accent"
              @click="handleToggleArchive"
            >
              {{ store.currentGroup.archived ? "Unarchive" : "Archive" }}
            </button>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-foreground">Delete group</p>
              <p class="text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>
            <button
              class="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
              @click="handleDeleteGroup"
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      <!-- Delete confirmation dialog -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="fixed inset-0 bg-black/50" @click="showDeleteConfirm = false" />
          <div class="relative z-10 w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 class="text-lg font-semibold mb-2">Delete group?</h3>
            <p class="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong>{{ store.currentGroup.name }}</strong> and all its data. This action cannot be undone.
            </p>
            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 text-sm rounded-md border border-border text-foreground hover:bg-accent"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
                :disabled="deleting"
                @click="confirmDelete"
              >
                {{ deleting ? "Deleting..." : "Delete" }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { CURRENCIES } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"

const route = useRoute()
const router = useRouter()
const store = useGroupsStore()

const loading = ref(true)
const error = ref("")

const presetColors = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

const groupForm = reactive({
  name: "",
  currency: "EUR",
  color: "",
})

const isCustomColor = computed(() => !presetColors.includes(groupForm.color))

const savingGroup = ref(false)
const groupSaved = ref(false)

const newMemberName = ref("")
const addingMember = ref(false)

const copied = ref(false)
const regenerating = ref(false)

const showDeleteConfirm = ref(false)
const deleting = ref(false)

const groupId = computed(() => route.params.id as string)

const inviteUrl = computed(() => {
  if (!store.currentGroup?.inviteCode) return ""
  return `${window.location.origin}/join/${store.currentGroup.inviteCode}`
})

onMounted(async () => {
  try {
    await store.fetchGroup(groupId.value)
    syncForm()
  } catch (e: any) {
    error.value = e.message || "Failed to load group"
  } finally {
    loading.value = false
  }
})

watch(() => store.currentGroup, syncForm)

function syncForm() {
  if (store.currentGroup) {
    groupForm.name = store.currentGroup.name
    groupForm.currency = store.currentGroup.currency
    groupForm.color = store.currentGroup.color || presetColors[4]
  }
}

async function handleUpdateGroup() {
  savingGroup.value = true
  groupSaved.value = false
  try {
    await store.updateGroup(groupId.value, {
      name: groupForm.name.trim(),
      currency: groupForm.currency,
      color: groupForm.color,
    } as any)
    groupSaved.value = true
    setTimeout(() => { groupSaved.value = false }, 2000)
  } catch (e: any) {
    error.value = e.message || "Failed to update group"
  } finally {
    savingGroup.value = false
  }
}

async function handleAddMember() {
  if (!newMemberName.value.trim()) return
  addingMember.value = true
  try {
    await store.addMember(groupId.value, { name: newMemberName.value.trim() })
    newMemberName.value = ""
  } catch (e: any) {
    error.value = e.message || "Failed to add member"
  } finally {
    addingMember.value = false
  }
}

async function handleUpdateMemberRole(memberId: string, role: "admin" | "member" | "readonly") {
  try {
    await store.updateMember(groupId.value, memberId, { role } as any)
  } catch (e: any) {
    error.value = e.message || "Failed to update member"
  }
}

async function handleRemoveMember(memberId: string, name: string) {
  if (!confirm(`Remove ${name} from the group?`)) return
  try {
    await store.removeMember(groupId.value, memberId)
  } catch (e: any) {
    error.value = e.message || "Failed to remove member"
  }
}

function copyInviteUrl() {
  navigator.clipboard.writeText(inviteUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function handleRegenerateInvite() {
  regenerating.value = true
  try {
    await store.updateGroup(groupId.value, {} as any)
    // The server should regenerate the invite code
    // Re-fetch to get the new code
    await store.fetchGroup(groupId.value)
  } catch (e: any) {
    error.value = e.message || "Failed to regenerate invite"
  } finally {
    regenerating.value = false
  }
}

async function handleToggleArchive() {
  try {
    await store.updateGroup(groupId.value, {
      archived: !store.currentGroup?.archived,
    } as any)
  } catch (e: any) {
    error.value = e.message || "Failed to update group"
  }
}

function handleDeleteGroup() {
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  deleting.value = true
  try {
    await store.deleteGroup(groupId.value)
    router.push("/")
  } catch (e: any) {
    error.value = e.message || "Failed to delete group"
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}
</script>
