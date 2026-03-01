export interface Debt {
  from: string
  to: string
  amount: number
}

export function simplifyDebts(balances: Map<string, number>): Debt[] {
  // Greedy algorithm: match largest creditor with largest debtor
  // Round amounts to avoid floating point issues
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  for (const [id, balance] of balances) {
    const rounded = Math.round(balance * 100) / 100
    if (rounded > 0) creditors.push({ id, amount: rounded })
    else if (rounded < 0) debtors.push({ id, amount: -rounded })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const debts: Debt[] = []
  let ci = 0,
    di = 0

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount)
    if (transfer > 0.01) {
      debts.push({
        from: debtors[di].id,
        to: creditors[ci].id,
        amount: Math.round(transfer * 100) / 100,
      })
    }
    creditors[ci].amount -= transfer
    debtors[di].amount -= transfer
    if (creditors[ci].amount < 0.01) ci++
    if (debtors[di].amount < 0.01) di++
  }

  return debts
}
