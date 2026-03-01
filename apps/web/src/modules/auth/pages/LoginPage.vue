<template>
  <div class="bg-card rounded-lg border border-border p-6 shadow-sm">
    <h2 class="text-xl font-semibold mb-4">Log in</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input v-model="email" type="email" required
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input v-model="password" type="password" required
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>
      <button type="submit" :disabled="loading"
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
        {{ loading ? "Logging in..." : "Log in" }}
      </button>
    </form>
    <p class="mt-4 text-sm text-center text-muted-foreground">
      Don't have an account? <RouterLink to="/register" class="text-primary hover:underline">Register</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref("")
const password = ref("")
const errorMsg = ref("")
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ""
  try {
    await auth.login(email.value, password.value)
    router.push((route.query.redirect as string) || "/")
  } catch (e: any) {
    errorMsg.value = e.message || "Login failed"
  } finally {
    loading.value = false
  }
}
</script>
