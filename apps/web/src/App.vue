<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import AuthLayout from "@/layouts/AuthLayout.vue"
import AppLayout from "@/layouts/AppLayout.vue"

const route = useRoute()

const layouts: Record<string, any> = {
  auth: AuthLayout,
  app: AppLayout,
}

const layout = computed(() => {
  const name = (route.meta.layout as string) || "app"
  return layouts[name] || AppLayout
})
</script>
