import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./db/schema"
import { _setDb, type DB } from "./lib/db"
import { resolve } from "path"

/**
 * Create a fresh in-memory PGlite test database, run migrations,
 * swap it into the app's db module, and return a cleanup function.
 */
export async function setupTestDb(): Promise<{ db: DB; cleanup: () => Promise<void> }> {
  const client = new PGlite()
  const testDb = drizzle(client, { schema }) as unknown as DB

  const migrationsFolder = resolve(import.meta.dir, "./db/migrations")
  await migrate(testDb as any, { migrationsFolder })

  _setDb(testDb)

  return {
    db: testDb,
    cleanup: async () => {
      await client.close()
    },
  }
}
