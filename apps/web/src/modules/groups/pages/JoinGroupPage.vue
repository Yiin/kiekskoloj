<template>
  <div class="bg-card rounded-lg border border-border p-6 shadow-sm max-w-md mx-auto">
    <h2 class="text-xl font-semibold mb-4">Join Group</h2>

    <div v-if="joinedGroup" class="space-y-4 text-center">
      <svg class="mx-auto w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-foreground font-medium">
        You joined <strong>{{ joinedGroup.name }}</strong>
      </p>
      <p class="text-sm text-muted-foreground">Redirecting...</p>
    </div>

    <form v-else @submit.prevent="handleJoin" class="space-y-4">
      <p class="text-sm text-muted-foreground">Pick a name to join this group.</p>
      <div>
        <label class="block text-sm font-medium mb-1">Your name</label>
        <input v-model="name" type="text" required maxlength="50" placeholder="Bob"
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>
      <button type="submit" :disabled="loading"
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
        {{ loading ? "Joining..." : "Join" }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Group } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"
import { useSessionStore } from "@/stores/auth"

const route = useRoute()
const router = useRouter()
const store = useGroupsStore()
const session = useSessionStore()

const name = ref("")
const errorMsg = ref("")
const loading = ref(false)
const joinedGroup = ref<Group | null>(null)

async function handleJoin() {
  if (!name.value.trim()) return
  loading.value = true
  errorMsg.value = ""
  const inviteCode = route.params.inviteCode as string
  try {
    const group = await store.joinGroup(inviteCode, name.value.trim())
    joinedGroup.value = group
    session.hasSession = true
    setTimeout(() => {
      router.push(`/groups/${group.id}`)
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e.message || "Failed to join group. The invite link may be invalid or expired."
  } finally {
    loading.value = false
  }
}
</script>
