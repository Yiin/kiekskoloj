/**
 * Format a numeric amount as a currency string.
 *
 * Uses Intl.NumberFormat under the hood, so the output respects
 * locale-specific grouping separators and decimal marks.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Convert an amount from one currency to another using the given exchange rate.
 * The rate should express: 1 unit of `from` = `rate` units of `to`.
 */
export function convertCurrency(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100
}
