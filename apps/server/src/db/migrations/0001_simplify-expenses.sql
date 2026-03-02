-- Combine title, category_id, note into a single comment field
-- Migrate existing data: concatenate title + note into comment

ALTER TABLE "expenses" ADD COLUMN "comment" text;

UPDATE "expenses" SET "comment" = CASE
  WHEN "note" IS NOT NULL AND "note" != '' THEN "title" || ' - ' || "note"
  ELSE "title"
END;

ALTER TABLE "expenses" DROP COLUMN "title";
ALTER TABLE "expenses" DROP COLUMN "category_id";
ALTER TABLE "expenses" DROP COLUMN "note";

-- Same for recurring_expenses
ALTER TABLE "recurring_expenses" ADD COLUMN "comment" text;

UPDATE "recurring_expenses" SET "comment" = "title";

ALTER TABLE "recurring_expenses" DROP COLUMN "title";
ALTER TABLE "recurring_expenses" DROP COLUMN "category_id";

-- Drop categories table (no longer needed)
DROP TABLE IF EXISTS "categories";
