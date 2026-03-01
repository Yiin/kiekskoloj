import { Elysia, t } from "elysia"
import { authGuard } from "../../middleware/auth-guard"
import { groupAccess } from "../../middleware/group-access"
import {
  uploadReceipt,
  getReceipt,
  deleteReceipt,
  getUploadDir,
  UploadError,
} from "./service"
import { join } from "path"

export const uploadRoutes = new Elysia({ prefix: "/groups" })
  .use(authGuard)
  .use(groupAccess)

  .post("/:groupId/expenses/:expenseId/receipts", async ({ params, member, body, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    try {
      const receipt = await uploadReceipt(params.expenseId, body.file)
      return { receipt }
    } catch (e) {
      if (e instanceof UploadError) {
        set.status = e.status
        return { error: "UPLOAD_ERROR", message: e.message }
      }
      throw e
    }
  }, {
    requireAuth: true,
    body: t.Object({
      file: t.File(),
    }),
  })

  .get("/:groupId/expenses/:expenseId/receipts/:receiptId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const receipt = await getReceipt(params.receiptId)
    if (!receipt) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Receipt not found" }
    }

    const filePath = join(getUploadDir(), receipt.filePath)
    const file = Bun.file(filePath)
    if (!await file.exists()) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Receipt file not found" }
    }

    set.headers["Content-Type"] = receipt.mimeType
    set.headers["Content-Disposition"] = `inline; filename="${receipt.filePath}"`
    return file
  }, { requireAuth: true })

  .delete("/:groupId/expenses/:expenseId/receipts/:receiptId", async ({ params, member, set }) => {
    if (!member) {
      set.status = 403
      return { error: "FORBIDDEN", message: "Not a member of this group" }
    }
    const receipt = await getReceipt(params.receiptId)
    if (!receipt) {
      set.status = 404
      return { error: "NOT_FOUND", message: "Receipt not found" }
    }
    await deleteReceipt(params.receiptId)
    set.status = 204
  }, { requireAuth: true })
