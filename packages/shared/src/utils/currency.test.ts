import { describe, it, expect } from "bun:test"
import { formatCurrency, convertCurrency } from "./currency"

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    const result = formatCurrency(1234.56, "USD")
    expect(result).toBe("$1,234.56")
  })

  it("formats EUR correctly", () => {
    const result = formatCurrency(1234.56, "EUR")
    expect(result).toBe("€1,234.56")
  })

  it("formats JPY with 2 decimal places (minimumFractionDigits: 2)", () => {
    // JPY normally has 0 decimal places, but the function forces 2
    const result = formatCurrency(1234, "JPY")
    expect(result).toBe("¥1,234.00")
  })

  it("formats zero amount", () => {
    const result = formatCurrency(0, "USD")
    expect(result).toBe("$0.00")
  })

  it("formats negative amounts", () => {
    const result = formatCurrency(-42.5, "USD")
    expect(result).toContain("42.50")
  })

  it("respects locale parameter", () => {
    const result = formatCurrency(1234.56, "EUR", "de-DE")
    // German locale uses comma for decimal, period for thousands
    expect(result).toContain("1.234,56")
  })

  it("rounds to 2 decimal places", () => {
    const result = formatCurrency(10.999, "USD")
    expect(result).toBe("$11.00")
  })
})

describe("convertCurrency", () => {
  it("converts with a simple rate", () => {
    // 100 USD at rate 0.85 = 85 EUR
    expect(convertCurrency(100, 0.85)).toBe(85)
  })

  it("converts with rate of 1 (same currency)", () => {
    expect(convertCurrency(42.50, 1)).toBe(42.50)
  })

  it("rounds to 2 decimal places", () => {
    // 33.33 * 1.5 = 49.995 -> should round to 50.00
    expect(convertCurrency(33.33, 1.5)).toBe(50)
  })

  it("handles very small amounts", () => {
    expect(convertCurrency(0.01, 0.85)).toBe(0.01)
  })

  it("handles large amounts", () => {
    expect(convertCurrency(1000000, 110.5)).toBe(110500000)
  })

  it("handles rate producing sub-cent result", () => {
    // 1 * 0.003 = 0.003 -> rounds to 0.00
    expect(convertCurrency(1, 0.003)).toBe(0)
  })

  it("correctly rounds 0.1 + 0.2 style floating point", () => {
    // 10 * 0.03 = 0.3 (should not be 0.30000000000000004)
    expect(convertCurrency(10, 0.03)).toBe(0.3)
  })
})
