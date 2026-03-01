import { Elysia, t } from "elysia"
import { CURRENCIES } from "@kiekskoloj/shared"
import { fetchExchangeRates, getCachedRates } from "./service"

export const currencyRoutes = new Elysia({ prefix: "/currencies" })

  .get("/", () => {
    return { currencies: CURRENCIES }
  })

  .get("/rates", async ({ query, set }) => {
    const base = query.base || "EUR"
    const symbols = query.symbols
      ? query.symbols.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    // Try cached first, fetch if nothing cached for this base
    let rates = await getCachedRates(base, symbols)

    if (rates.length === 0) {
      try {
        const fetched = await fetchExchangeRates(base)
        rates = await getCachedRates(base, symbols)
      } catch (e) {
        set.status = 502
        return { error: "EXCHANGE_RATE_ERROR", message: "Failed to fetch exchange rates" }
      }
    }

    const ratesObj: Record<string, number> = {}
    for (const r of rates) {
      ratesObj[r.target] = r.rate
    }

    return { base, rates: ratesObj }
  }, {
    query: t.Object({
      base: t.Optional(t.String()),
      symbols: t.Optional(t.String()),
    }),
  })
