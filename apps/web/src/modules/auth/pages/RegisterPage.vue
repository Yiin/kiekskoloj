<template>
  <div class="bg-card rounded-lg border border-border p-6 shadow-sm">
    <h2 class="text-xl font-semibold mb-4">Create account</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Name</label>
        <input v-model="name" type="text" required
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input v-model="email" type="email" required
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input v-model="password" type="password" required minlength="8"
          class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <p class="text-xs text-muted-foreground mt-1">At least 8 characters</p>
      </div>
      <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>
      <button type="submit" :disabled="loading"
        class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
        {{ loading ? "Creating account..." : "Create account" }}
      </button>
    </form>
    <p class="mt-4 text-sm text-center text-muted-foreground">
      Already have an account? <RouterLink to="/login" class="text-primary hover:underline">Log in</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const auth = useAuthStore()
const router = useRouter()

const name = ref("")
const email = ref("")
const password = ref("")
const errorMsg = ref("")
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ""
  try {
    await auth.register(email.value, name.value, password.value)
    router.push("/")
  } catch (e: any) {
    errorMsg.value = e.message || "Registration failed"
  } finally {
    loading.value = false
  }
}
</script>
