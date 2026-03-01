import { defineStore } from "pinia"
import { ref, watch } from "vue"
import { loadLocale } from "@/lib/i18n"

export const useUiStore = defineStore("ui", () => {
  const theme = ref<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  )
  const locale = ref(localStorage.getItem("locale") || "en")
  const sidebarOpen = ref(true)

  watch(theme, (val) => {
    localStorage.setItem("theme", val)
    document.documentElement.classList.toggle("dark", val === "dark")
  }, { immediate: true })

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light"
  }

  async function setLocale(newLocale: string) {
    await loadLocale(newLocale)
    locale.value = newLocale
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return { theme, locale, sidebarOpen, toggleTheme, setLocale, toggleSidebar }
})
