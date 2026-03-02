<template>
  <div class="min-h-screen flex">
    <aside v-if="ui.sidebarOpen" class="w-64 bg-card border-r border-border/50 hidden md:flex md:flex-col">
      <div class="flex items-center gap-2.5 px-5 h-16">
        <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/25">
          <span class="text-sm font-bold text-primary-foreground">K</span>
        </div>
        <h1 class="text-lg font-bold text-foreground tracking-tight">Kiekskoloj</h1>
      </div>
      <nav class="px-3 mt-2 space-y-1">
        <RouterLink
          to="/groups"
          class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200"
          :class="route.name === 'groups' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
          </svg>
          All Groups
        </RouterLink>
      </nav>

      <div v-if="groupsStore.groups.length > 0" class="mt-5 px-3">
        <p class="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Your Groups
        </p>
        <nav class="space-y-0.5">
          <RouterLink
            v-for="group in groupsStore.groups"
            :key="group.id"
            :to="`/groups/${group.id}`"
            class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-colors duration-200"
            :class="isCurrentGroup(group.id) ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
          >
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-card"
              :style="{ backgroundColor: group.color || '#9ca3af' }"
            />
            <span class="truncate">{{ group.name }}</span>
          </RouterLink>
        </nav>
      </div>
    </aside>
    <main class="flex-1 p-4 md:p-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import { useRoute } from "vue-router"
import { useGroupsStore } from "@/stores/groups"
import { useUiStore } from "@/stores/ui"

const groupsStore = useGroupsStore()
const ui = useUiStore()
const route = useRoute()

function isCurrentGroup(id: string) {
  const paramId = route.params.id as string | undefined
  return paramId === id
}

onMounted(async () => {
  if (groupsStore.groups.length === 0) {
    try {
      await groupsStore.fetchGroups()
    } catch {
      // Sidebar groups are non-critical; fail silently
    }
  }
})
</script>
