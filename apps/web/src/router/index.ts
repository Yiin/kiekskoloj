import { createRouter, createWebHistory } from "vue-router"
import { useSessionStore } from "@/stores/auth"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "landing",
      component: () => import("@/modules/groups/pages/LandingPage.vue"),
      meta: { layout: "auth" },
    },
    {
      path: "/groups",
      name: "groups",
      component: () => import("@/modules/groups/pages/GroupListPage.vue"),
    },
    {
      path: "/groups/:id",
      name: "group-detail",
      component: () => import("@/modules/groups/pages/GroupDetailPage.vue"),
    },
    {
      path: "/groups/:id/expenses",
      name: "expense-list",
      component: () => import("@/modules/expenses/pages/ExpenseListPage.vue"),
    },
    {
      path: "/groups/:id/expenses/new",
      name: "expense-create",
      component: () => import("@/modules/expenses/pages/ExpenseFormPage.vue"),
    },
    {
      path: "/groups/:id/expenses/:expenseId",
      name: "expense-edit",
      component: () => import("@/modules/expenses/pages/ExpenseFormPage.vue"),
    },
    {
      path: "/groups/:id/settlements",
      name: "group-settlements",
      component: () => import("@/modules/settlements/pages/SettlementsPage.vue"),
    },
    {
      path: "/groups/:id/settings",
      name: "group-settings",
      component: () => import("@/modules/groups/pages/GroupSettingsPage.vue"),
    },
    {
      path: "/groups/:id/stats",
      name: "group-stats",
      component: () => import("@/modules/stats/pages/StatsPage.vue"),
    },
    {
      path: "/join/:inviteCode",
      name: "join-group",
      component: () => import("@/modules/groups/pages/JoinGroupPage.vue"),
      meta: { layout: "auth" },
    },
  ],
})

router.beforeEach(async (to) => {
  // Landing and join pages don't require a session
  if (to.meta.layout === "auth") return

  const session = useSessionStore()
  if (!session.checked) {
    await session.checkSession()
  }

  if (!session.hasSession) {
    return { name: "landing" }
  }
})

export default router
