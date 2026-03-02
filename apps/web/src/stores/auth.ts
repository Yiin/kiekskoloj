import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { useApi } from "@/composables/useApi"

export const useSessionStore = defineStore("session", () => {
  const hasSession = ref(false)
  const checked = ref(false)
  const api = useApi()

  async function checkSession() {
    try {
      const res = await api.get<{ hasSession: boolean }>("/groups/session")
      hasSession.value = res.hasSession
    } catch {
      hasSession.value = false
    }
    checked.value = true
  }

  return { hasSession, checked, checkSession }
})
