import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/modules/auth/pages/LoginPage.vue"),
      meta: { layout: "auth", guest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/modules/auth/pages/RegisterPage.vue"),
      meta: { layout: "auth", guest: true },
    },
    {
      path: "/",
      name: "groups",
      component: () => import("@/modules/groups/pages/GroupListPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id",
      name: "group-detail",
      component: () => import("@/modules/groups/pages/GroupDetailPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/expenses",
      name: "expense-list",
      component: () => import("@/modules/expenses/pages/ExpenseListPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/expenses/new",
      name: "expense-create",
      component: () => import("@/modules/expenses/pages/ExpenseFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/expenses/:expenseId",
      name: "expense-edit",
      component: () => import("@/modules/expenses/pages/ExpenseFormPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/settlements",
      name: "group-settlements",
      component: () => import("@/modules/settlements/pages/SettlementsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/settings",
      name: "group-settings",
      component: () => import("@/modules/groups/pages/GroupSettingsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id/stats",
      name: "group-stats",
      component: () => import("@/modules/stats/pages/StatsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/join/:inviteCode",
      name: "join-group",
      component: () => import("@/modules/groups/pages/JoinGroupPage.vue"),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated && !to.meta.guest) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } }
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: "groups" }
  }
})

export default router
