<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Groups</h1>
      <button
        class="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors text-sm font-medium"
        @click="showCreate = true"
      >
        New Group
      </button>
    </div>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-muted/70 animate-pulse" />
    </div>

    <div v-else-if="store.groups.length === 0" class="text-center py-16">
      <svg class="mx-auto w-12 h-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="text-muted-foreground mb-4">No groups yet. Create one to get started!</p>
      <button
        class="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors text-sm font-medium"
        @click="showCreate = true"
      >
        Create your first group
      </button>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GroupCard v-for="group in store.groups" :key="group.id" :group="group" />
    </div>

    <CreateGroupDialog
      :open="showCreate"
      @close="showCreate = false"
      @created="onGroupCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useGroupsStore } from "@/stores/groups"
import GroupCard from "../components/GroupCard.vue"
import CreateGroupDialog from "../components/CreateGroupDialog.vue"

const store = useGroupsStore()
const router = useRouter()
const loading = ref(true)
const showCreate = ref(false)

onMounted(async () => {
  try {
    await store.fetchGroups()
  } finally {
    loading.value = false
  }
})

function onGroupCreated(groupId: string) {
  router.push(`/groups/${groupId}`)
}
</script>
