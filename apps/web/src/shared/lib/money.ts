/** Money helpers. Amounts are integer minor units; JPY has no sub-unit so the
 * integer is the yen value. Mirrors the prototype `yen()` output (`¥` + grouped
 * integer) while staying locale-aware for grouping. */
const SYMBOLS: Record<string, string> = { JPY: "¥", USD: "$", EUR: "€" };

export function formatMoney(
  amount: number,
  currency = "JPY",
  locale = "en-US",
): string {
  const symbol = SYMBOLS[currency] ?? "";
  const grouped = Math.round(amount).toLocaleString(locale);
  return `${symbol}${grouped}`;
}

export function sumMinor(amounts: readonly number[]): number {
  return amounts.reduce((total, n) => total + n, 0);
}
