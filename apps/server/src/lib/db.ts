import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import * as schema from "../db/schema"
import { resolve } from "path"

const connectionString = Bun.env.DATABASE_URL || "postgres://localhost:5432/kiekskoloj"
const sql = postgres(connectionString)

export let db = drizzle(sql, { schema })
export type DB = typeof db

/** Replace the active db instance. Only for use in tests. */
export function _setDb(newDb: DB) {
  db = newDb
}

/** Run Drizzle migrations. Call once on startup. */
export async function runMigrations() {
  const migrationsFolder = Bun.env.MIGRATIONS_PATH || resolve(import.meta.dir, "../db/migrations")
  await migrate(db, { migrationsFolder })
}
