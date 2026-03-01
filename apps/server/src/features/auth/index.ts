import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { createUser, verifyLogin, getUserById, updateUser } from "./service"

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(authGuard)
  .post("/register", async ({ body, jwt, cookie: { auth }, set }) => {
    try {
      const user = await createUser(body.email, body.name, body.password)
      const token = await jwt.sign({ sub: user!.id })
      auth.set({
        value: token,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 86400,
      })
      return { user }
    } catch (e: any) {
      if (e.message?.startsWith("CONFLICT:")) {
        set.status = 409
        return { error: "CONFLICT", message: e.message.slice(9) }
      }
      throw e
    }
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      name: t.String({ minLength: 1 }),
      password: t.String({ minLength: 8 }),
    }),
  })
  .post("/login", async ({ body, jwt, cookie: { auth }, set }) => {
    const user = await verifyLogin(body.email, body.password)
    if (!user) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Invalid email or password" }
    }

    const token = await jwt.sign({ sub: user.id })
    auth.set({
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    })
    return { user }
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 1 }),
    }),
  })
  .post("/logout", ({ cookie: { auth } }) => {
    auth.remove()
    return new Response(null, { status: 204 })
  })
  .get("/me", async ({ userId, set }) => {
    if (!userId) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Not authenticated" }
    }
    const user = await getUserById(userId)
    if (!user) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "User not found" }
    }
    return { user }
  }, { requireAuth: true })
  .put("/me", async ({ userId, body, set }) => {
    if (!userId) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Not authenticated" }
    }
    const user = await updateUser(userId, body)
    return { user }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      locale: t.Optional(t.String()),
    }),
  })
