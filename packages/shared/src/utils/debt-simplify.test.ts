import { describe, it, expect } from "bun:test"
import { simplifyDebts, type Debt } from "./debt-simplify"

describe("simplifyDebts", () => {
  it("handles a simple 2-person debt (A owes B)", () => {
    const balances = new Map<string, number>([
      ["A", -50], // A owes 50
      ["B", 50],  // B is owed 50
    ])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(1)
    expect(debts[0]).toEqual({ from: "A", to: "B", amount: 50 })
  })

  it("handles 3-person circular debt (A owes B, B owes C, C owes A)", () => {
    // A owes B 30, B owes C 30, C owes A 30
    // Net: A: -30+30=0, B: +30-30=0, C: +30-30=0
    // All balanced, no debts needed
    const balances = new Map<string, number>([
      ["A", 0],
      ["B", 0],
      ["C", 0],
    ])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(0)
  })

  it("handles 3-person circular debt with unequal amounts", () => {
    // A owes B 10, B owes C 20, C owes A 5
    // Net: A: -10+5 = -5, B: +10-20 = -10, C: +20-5 = +15
    const balances = new Map<string, number>([
      ["A", -5],
      ["B", -10],
      ["C", 15],
    ])
    const debts = simplifyDebts(balances)

    // Total owed to C is 15: B owes 10, A owes 5
    const totalOwed = debts.reduce((sum, d) => sum + d.amount, 0)
    expect(totalOwed).toBe(15)

    // All debts should flow to C
    for (const d of debts) {
      expect(d.to).toBe("C")
    }
  })

  it("returns empty array when all balances are zero", () => {
    const balances = new Map<string, number>([
      ["A", 0],
      ["B", 0],
      ["C", 0],
      ["D", 0],
    ])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(0)
  })

  it("handles single creditor with multiple debtors", () => {
    const balances = new Map<string, number>([
      ["A", 100],  // A is owed 100
      ["B", -40],  // B owes 40
      ["C", -35],  // C owes 35
      ["D", -25],  // D owes 25
    ])
    const debts = simplifyDebts(balances)

    // All debts should flow to A
    for (const d of debts) {
      expect(d.to).toBe("A")
    }

    const totalPaid = debts.reduce((sum, d) => sum + d.amount, 0)
    expect(totalPaid).toBe(100)
    expect(debts).toHaveLength(3)
  })

  it("handles large group (5+ people) with various balances netting to zero", () => {
    const balances = new Map<string, number>([
      ["Alice", 120],
      ["Bob", -30],
      ["Carol", 50],
      ["Dave", -80],
      ["Eve", -40],
      ["Frank", -20],
    ])

    // Verify balances net to zero
    let total = 0
    for (const [, v] of balances) total += v
    expect(total).toBe(0)

    const debts = simplifyDebts(balances)

    // Verify conservation: total paid equals total received
    const totalPaid = debts.reduce((sum, d) => sum + d.amount, 0)
    const creditorTotal = 120 + 50 // 170
    expect(totalPaid).toBe(creditorTotal)

    // No debt should have from === to
    for (const d of debts) {
      expect(d.from).not.toBe(d.to)
      expect(d.amount).toBeGreaterThan(0)
    }

    // Number of debts should be at most n-1 (greedy simplification)
    expect(debts.length).toBeLessThanOrEqual(5)
  })

  it("ignores very small amounts (< 0.01)", () => {
    const balances = new Map<string, number>([
      ["A", 0.005],
      ["B", -0.005],
    ])
    const debts = simplifyDebts(balances)
    // 0.005 rounds to 0.01, and the threshold is > 0.01, so 0.01 is not > 0.01
    // Actually Math.round(0.005 * 100) / 100 = 0.01 (or 0.0 depending on float)
    // Let's verify: the transfer is min(0.01, 0.01) = 0.01, but condition is > 0.01
    // So 0.01 is NOT > 0.01, it should be ignored
    expect(debts).toHaveLength(0)
  })

  it("handles amounts just above the threshold", () => {
    const balances = new Map<string, number>([
      ["A", 0.02],
      ["B", -0.02],
    ])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(1)
    expect(debts[0]).toEqual({ from: "B", to: "A", amount: 0.02 })
  })

  it("handles empty balances map", () => {
    const balances = new Map<string, number>()
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(0)
  })

  it("correctly rounds floating point amounts", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    const balances = new Map<string, number>([
      ["A", 0.1 + 0.2],
      ["B", -(0.1 + 0.2)],
    ])
    const debts = simplifyDebts(balances)
    expect(debts).toHaveLength(1)
    expect(debts[0].amount).toBe(0.3)
  })
})
