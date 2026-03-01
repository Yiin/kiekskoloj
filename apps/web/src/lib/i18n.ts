import { createI18n } from "vue-i18n"

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("locale") || "en",
  fallbackLocale: "en",
  messages: {},
})

export async function loadLocale(locale: string) {
  const messages = await fetch(`/locales/${locale}.json`).then((r) => r.json())
  i18n.global.setLocaleMessage(locale, messages)
  i18n.global.locale.value = locale
  localStorage.setItem("locale", locale)
}

export default i18n
