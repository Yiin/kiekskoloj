import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core"
import { expenses } from "./expenses"

export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
})
