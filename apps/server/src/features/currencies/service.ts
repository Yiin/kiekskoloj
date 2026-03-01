import { db } from "../../lib/db"
import { exchangeRates } from "../../db/schema"
import { eq, and } from "drizzle-orm"

const STALE_MS = 24 * 60 * 60 * 1000 // 24 hours

interface FrankfurterResponse {
  base: string
  date: string
  rates: Record<string, number>
}

/**
 * Fetch exchange rates from frankfurter.app and cache them in the DB.
 */
export async function fetchExchangeRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch exchange rates: ${res.status} ${res.statusText}`)
  }

  const data = (await res.json()) as FrankfurterResponse
  const now = Date.now()

  for (const [target, rate] of Object.entries(data.rates)) {
    await db
      .insert(exchangeRates)
      .values({ base, target, rate, fetchedAt: now })
      .onConflictDoUpdate({
        target: [exchangeRates.base, exchangeRates.target],
        set: { rate, fetchedAt: now },
      })
  }

  return data.rates
}

/**
 * Get the exchange rate for base -> target.
 * Returns cached rate if fresh (< 24h), otherwise fetches new rates.
 */
export async function getRate(base: string, target: string): Promise<number> {
  if (base === target) return 1

  const cached = await db
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.base, base), eq(exchangeRates.target, target)))
    .then((rows) => rows[0] || null)

  if (cached && Date.now() - cached.fetchedAt < STALE_MS) {
    return cached.rate
  }

  const rates = await fetchExchangeRates(base)
  if (rates[target] === undefined) {
    throw new Error(`No exchange rate found for ${base} -> ${target}`)
  }
  return rates[target]
}

/**
 * Get all cached rates for a base currency (optionally filtered by symbols).
 */
export async function getCachedRates(
  base?: string,
  symbols?: string[],
): Promise<{ base: string; target: string; rate: number; fetchedAt: number }[]> {
  let rows: { base: string; target: string; rate: number; fetchedAt: number }[]

  if (base) {
    rows = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.base, base))
  } else {
    rows = await db.select().from(exchangeRates)
  }

  if (symbols && symbols.length > 0) {
    rows = rows.filter((r) => symbols.includes(r.target))
  }

  return rows
}
