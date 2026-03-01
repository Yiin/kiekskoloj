import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { UserProfile } from "@kiekskoloj/shared"
import { useApi } from "@/composables/useApi"

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserProfile | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const api = useApi()

  async function login(email: string, password: string) {
    const res = await api.post<{ user: UserProfile }>("/auth/login", { email, password })
    user.value = res.user
  }

  async function register(email: string, name: string, password: string) {
    const res = await api.post<{ user: UserProfile }>("/auth/register", { email, name, password })
    user.value = res.user
  }

  async function logout() {
    await api.post("/auth/logout")
    user.value = null
  }

  async function fetchMe() {
    try {
      const res = await api.get<{ user: UserProfile }>("/auth/me")
      user.value = res.user
    } catch {
      user.value = null
    }
  }

  return { user, isAuthenticated, login, register, logout, fetchMe }
})
