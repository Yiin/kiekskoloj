import { Elysia } from "elysia"

export const authGuard = new Elysia({ name: "auth-guard" })
  .derive({ as: "scoped" }, ({ cookie: { session } }) => {
    return { memberToken: (session?.value as string) || null }
  })
  .macro({
    requireAuth(enabled: boolean) {
      if (!enabled) return
      return {
        beforeHandle({ memberToken, set }) {
          if (!memberToken) {
            set.status = 401
            return { error: "UNAUTHORIZED", message: "Session required" }
          }
        }
      }
    }
  })
