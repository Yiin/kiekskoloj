import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  createGroup,
  getGroupsByToken,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  updateMember,
  removeMember,
  regenerateInviteCode,
  joinGroup,
  generateSessionToken,
} from "./service"

function setSessionCookie(cookie: any, token: string) {
  cookie.session.set({
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86400,
  })
}

export const groupRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .get("/", async ({ memberToken, set }) => {
    if (!memberToken) {
      return { groups: [] }
    }
    const groups = await getGroupsByToken(memberToken)
    return { groups }
  })

  .post("/", async ({ memberToken, body, cookie }) => {
    const sessionToken = memberToken || generateSessionToken()
    const group = await createGroup(body, body.memberName, sessionToken)
    if (!memberToken) {
      setSessionCookie(cookie, sessionToken)
    }
    return { group }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      memberName: t.String({ minLength: 1 }),
      currency: t.Optional(t.String()),
      color: t.Optional(t.String()),
    }),
  })

  .post("/join/:inviteCode", async ({ memberToken, params, body, cookie, set }) => {
    const sessionToken = memberToken || generateSessionToken()
    try {
      const result = await joinGroup(params.inviteCode, body.name, sessionToken)
      if (!result) {
        set.status = 404
        return { error: "NOT_FOUND", message: "Invalid invite code" }
      }
      if (!memberToken) {
        setSessionCookie(cookie, sessionToken)
      }
      return { group: result.group, member: result.member }
    } catch (e: any) {
      if (e.message?.startsWith("CONFLICT:")) {
        set.status = 409
        return { error: "CONFLICT", message: e.message.slice(9) }
      }
      throw e
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
    }),
  })

  .get("/session", ({ memberToken }) => {
    return { hasSession: !!memberToken }
  })

  .use(groupAccess)

  .get("/:groupId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const group = await getGroupById(params.groupId)
    if (!group) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Group not found" }
    }
    return { group }
  }, { requireAuth: true })

  .put("/:groupId", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const group = await updateGroup(params.groupId, body)
    return { group }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      currency: t.Optional(t.String()),
      color: t.Optional(t.String()),
      archived: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:groupId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    await deleteGroup(params.groupId)
    set.status = 204
  }, { requireAuth: true })

  .post("/:groupId/members", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const newMember = await addMember(params.groupId, body)
    return { member: newMember }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
      weight: t.Optional(t.Number()),
    }),
  })

  .put("/:groupId/members/:memberId", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const updated = await updateMember(params.memberId, body)
    return { member: updated }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      weight: t.Optional(t.Number()),
      active: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:groupId/members/:memberId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    await removeMember(params.memberId)
    set.status = 204
  }, { requireAuth: true })

  .post("/:groupId/invite/regenerate", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const result = await regenerateInviteCode(params.groupId)
    return result
  }, { requireAuth: true })
