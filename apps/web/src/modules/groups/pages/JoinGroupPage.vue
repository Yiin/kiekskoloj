<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center max-w-sm">
      <div v-if="joining" class="space-y-4">
        <div class="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="text-muted-foreground">Joining group...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <svg class="mx-auto w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p class="text-destructive font-medium">{{ error }}</p>
        <RouterLink to="/" class="inline-block text-sm text-primary hover:underline">
          Go to groups
        </RouterLink>
      </div>

      <div v-else-if="joinedGroup" class="space-y-4">
        <svg class="mx-auto w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-foreground font-medium">
          You joined <strong>{{ joinedGroup.name }}</strong>
        </p>
        <p class="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Group } from "@kiekskoloj/shared"
import { useGroupsStore } from "@/stores/groups"

const route = useRoute()
const router = useRouter()
const store = useGroupsStore()

const joining = ref(true)
const error = ref("")
const joinedGroup = ref<Group | null>(null)

onMounted(async () => {
  const inviteCode = route.params.inviteCode as string
  try {
    const group = await store.joinGroup(inviteCode)
    joinedGroup.value = group
    setTimeout(() => {
      router.push(`/groups/${group.id}`)
    }, 1500)
  } catch (e: any) {
    error.value = e.message || "Failed to join group. The invite link may be invalid or expired."
  } finally {
    joining.value = false
  }
})
</script>
