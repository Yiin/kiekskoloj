import { createApp } from "vue"
import { createPinia } from "pinia"
import App from "./App.vue"
import router from "./router"
import i18n, { loadLocale } from "./lib/i18n"
import "./assets/index.css"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

loadLocale(i18n.global.locale.value).then(() => {
  app.mount("#app")
})
