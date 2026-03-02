<template>
  <div class="bg-card rounded-lg border border-border p-6 shadow-sm">
    <div v-if="mode === 'menu'" class="space-y-4">
      <p class="text-muted-foreground text-center">Split expenses with friends</p>
      <button
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        @click="mode = 'create'"
      >
        Create new group
      </button>
      <button
        class="w-full py-2 px-4 border border-border text-foreground rounded-md hover:bg-accent"
        @click="mode = 'join'"
      >
        Enter invite code
      </button>
    </div>

    <div v-else-if="mode === 'create'">
      <h2 class="text-xl font-semibold mb-4">Create Group</h2>
      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Group name</label>
          <input v-model="createForm.name" type="text" required maxlength="100" placeholder="Trip to Japan"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Your name</label>
          <input v-model="createForm.memberName" type="text" required maxlength="50" placeholder="Alice"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Currency</label>
          <select v-model="createForm.currency"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
              {{ c.symbol }} {{ c.code }} - {{ c.name }}
            </option>
          </select>
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <div class="flex gap-3">
          <button type="button" class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent" @click="mode = 'menu'">
            Back
          </button>
          <button type="submit" :disabled="loading"
            class="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
            {{ loading ? "Creating..." : "Create" }}
          </button>
        </div>
      </form>
    </div>

    <div v-else-if="mode === 'join'">
      <h2 class="text-xl font-semibold mb-4">Join Group</h2>
      <form @submit.prevent="handleJoin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Invite code</label>
          <input v-model="joinForm.inviteCode" type="text" required placeholder="Paste invite code"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Your name</label>
          <input v-model="joinForm.name" type="text" required maxlength="50" placeholder="Bob"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <div class="flex gap-3">
          <button type="button" class="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent" @click="mode = 'menu'">
            Back
          </button>
          <button type="submit" :disabled="loading"
            class="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
            {{ loading ? "Joining..." : "Join" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { CURRENCIES } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"
import { useSessionStore } from "@/stores/auth"

const router = useRouter()
const route = useRoute()
const groupsStore = useGroupsStore()
const session = useSessionStore()

const mode = ref<"menu" | "create" | "join">("menu")
const loading = ref(false)
const error = ref("")

const createForm = reactive({
  name: "",
  memberName: "",
  currency: "EUR",
})

const joinForm = reactive({
  inviteCode: "",
  name: "",
})

onMounted(async () => {
  // If already has session, redirect to groups
  if (!session.checked) {
    await session.checkSession()
  }
  if (session.hasSession) {
    router.replace("/groups")
  }
})

async function handleCreate() {
  if (!createForm.name.trim() || !createForm.memberName.trim()) return
  loading.value = true
  error.value = ""
  try {
    const group = await groupsStore.createGroup({
      name: createForm.name.trim(),
      memberName: createForm.memberName.trim(),
      currency: createForm.currency,
    })
    session.hasSession = true
    router.push(`/groups/${group.id}`)
  } catch (e: any) {
    error.value = e.message || "Failed to create group"
  } finally {
    loading.value = false
  }
}

async function handleJoin() {
  if (!joinForm.inviteCode.trim() || !joinForm.name.trim()) return
  loading.value = true
  error.value = ""
  try {
    const group = await groupsStore.joinGroup(joinForm.inviteCode.trim(), joinForm.name.trim())
    session.hasSession = true
    router.push(`/groups/${group.id}`)
  } catch (e: any) {
    error.value = e.message || "Failed to join group"
  } finally {
    loading.value = false
  }
}
</script>
