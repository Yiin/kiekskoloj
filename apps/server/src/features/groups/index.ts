import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  updateMember,
  removeMember,
  regenerateInviteCode,
  joinGroup,
} from "./service"

export const groupRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .get("/", async ({ userId, set }) => {
    if (!userId) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Authentication required" }
    }
    const groups = await getUserGroups(userId)
    return { groups }
  }, { requireAuth: true })

  .post("/", async ({ userId, body, set }) => {
    if (!userId) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Authentication required" }
    }
    const group = await createGroup(userId, body)
    return { group }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
      currency: t.Optional(t.String()),
      color: t.Optional(t.String()),
    }),
  })

  .post("/join/:inviteCode", async ({ userId, params, body, set }) => {
    if (!userId) {
      set.status = 401
      return { error: "UNAUTHORIZED", message: "Authentication required" }
    }
    const result = await joinGroup(params.inviteCode, userId, body.name)
    if (!result) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Invalid invite code" }
    }
    return result
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
    }),
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
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
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
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
    }
    await deleteGroup(params.groupId)
    set.status = 204
  }, { requireAuth: true })

  .post("/:groupId/members", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
    }
    const newMember = await addMember(params.groupId, body)
    return { member: newMember }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.String({ minLength: 1 }),
      userId: t.Optional(t.String()),
      role: t.Optional(t.String()),
      weight: t.Optional(t.Number()),
    }),
  })

  .put("/:groupId/members/:memberId", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
    }
    const updated = await updateMember(params.memberId, body)
    return { member: updated }
  }, {
    requireAuth: true,
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      weight: t.Optional(t.Number()),
      role: t.Optional(t.String()),
      active: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:groupId/members/:memberId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
    }
    await removeMember(params.memberId)
    set.status = 204
  }, { requireAuth: true })

  .post("/:groupId/invite/regenerate", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    if (member.role !== "admin") {
      set.status = 403
      return { error: "FORBIDDEN", message: "Admin access required" }
    }
    const result = await regenerateInviteCode(params.groupId)
    return result
  }, { requireAuth: true })
