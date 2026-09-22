// lib/finance/format.ts

export const CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "LBP", label: "Lebanese Pound" },
] as const;

/**
 * Exchange rates relative to USD.
 * 1 USD = EXCHANGE_RATES.LBP LBP
 * Update these when the rate changes materially.
 */
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  LBP: 89900,
};

/**
 * Convert a value in `from` currency to `to` currency.
 * Returns the same value if currencies match or either is unknown.
 */
export function convertCurrency(
  value: number,
  from: string,
  to: string,
): number {
  if (from === to) return value;
  const fromRate = EXCHANGE_RATES[from];
  const toRate = EXCHANGE_RATES[to];
  if (!fromRate || !toRate) return value;
  // Convert to USD first (base), then to target.
  return (value / fromRate) * toRate;
}

// ---- existing helpers below, unchanged ----

export function formatMoney(cents: number, currency: string, compact = false) {
  // LBP has no practical minor unit — display whole pounds.
  const divisor = currency === "LBP" ? 100 : 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : currency === "LBP" ? 0 : 2,
    minimumFractionDigits: compact ? 0 : currency === "LBP" ? 0 : 2,
  }).format(cents / divisor);
}

export function toCents(value: string | number) {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export function fromCents(cents: number) {
  return (cents / 100).toFixed(2);
}