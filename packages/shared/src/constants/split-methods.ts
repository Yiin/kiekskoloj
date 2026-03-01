export const SPLIT_METHODS = ['equal', 'percentage', 'amount', 'weight', 'shares'] as const
export const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: 'Equal',
  percentage: 'By Percentage',
  amount: 'By Amount',
  weight: 'By Weight',
  shares: 'By Shares',
}
