import { Elysia } from "elysia"
import cors from "@elysiajs/cors"
import swagger from "@elysiajs/swagger"
import { groupRoutes } from "./features/groups"
import { expenseRoutes } from "./features/expenses"
import { settlementRoutes } from "./features/settlements"
import { currencyRoutes } from "./features/currencies"
import { uploadRoutes } from "./features/uploads"
import { activityRoutes } from "./features/activity"
import { statsRoutes } from "./features/stats"
import { exportRoutes } from "./features/exports"
import { recurringRoutes } from "./features/recurring"
import { wsRoutes } from "./features/ws"
import { processDueRecurring } from "./features/recurring/service"
import { runMigrations } from "./lib/db"

const port = parseInt(Bun.env.PORT || "3006")

// Run migrations
await runMigrations()

// Process due recurring expenses every hour
setInterval(() => processDueRecurring().catch(console.error), 60 * 60 * 1000)

const app = new Elysia({ prefix: "/api" })
  .use(cors({
    origin: true,
    credentials: true,
  }))
  .use(swagger({ path: "/docs" }))
  .use(groupRoutes)
  .use(expenseRoutes)
  .use(settlementRoutes)
  .use(currencyRoutes)
  .use(uploadRoutes)
  .use(activityRoutes)
  .use(statsRoutes)
  .use(exportRoutes)
  .use(recurringRoutes)
  .use(wsRoutes)
  .get("/health", () => ({ status: "ok" }))
  .listen(port)

console.log(`Server running at http://localhost:${port}`)

export type App = typeof app
