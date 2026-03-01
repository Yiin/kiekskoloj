<template>
  <RouterLink
    :to="`/groups/${group.id}`"
    class="block rounded-lg border border-border bg-card overflow-hidden transition-shadow hover:shadow-md"
  >
    <div class="h-1.5" :style="{ backgroundColor: group.color || '#e5e7eb' }" />
    <div class="p-4">
      <h3 class="font-semibold text-card-foreground truncate">{{ group.name }}</h3>
      <div class="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{{ group.currency }}</span>
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ group.memberCount }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import type { Group } from "@kiekskoloj/shared"

defineProps<{
  group: Group & { memberCount: number }
}>()
</script>
