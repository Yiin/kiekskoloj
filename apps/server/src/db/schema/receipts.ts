import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { expenses } from "./expenses"

export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
})
