import { Elysia } from "elysia"
import { jwtPlugin } from "../lib/auth"

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, cookie: { auth } }) => {
    if (!auth?.value) return { userId: null as string | null }
    const payload = await jwt.verify(auth.value)
    if (!payload || !payload.sub) return { userId: null as string | null }
    return { userId: payload.sub as string }
  })
  .macro({
    requireAuth(enabled: boolean) {
      if (!enabled) return
      return {
        beforeHandle({ userId, set }) {
          if (!userId) {
            set.status = 401
            return { error: "UNAUTHORIZED", message: "Authentication required" }
          }
        }
      }
    }
  })
