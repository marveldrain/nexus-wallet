/**
 * Display formatting. All token math uses bigint base units so we never lose
 * precision; only the final human-readable string uses limited decimals.
 */

/** Format a bigint base-unit amount as a trimmed decimal string (display only). */
export function formatTokenAmount(amount: bigint, decimals: number, maxFractionDigits = 6): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;

  let fracStr = frac.toString().padStart(decimals, '0').slice(0, maxFractionDigits);
  fracStr = fracStr.replace(/0+$/, '');

  const out = fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  return negative ? `-${out}` : out;
}

/** Exact-ish conversion of base units to a JS number for valuation (display only). */
export function toDecimalNumber(amount: bigint, decimals: number): number {
  // Going via the precise decimal string avoids bigint→number rounding for
  // large values (e.g. 18-decimal wei).
  return Number(formatTokenAmount(amount, decimals, decimals));
}

/**
 * Format a value in any ISO 4217 currency (defaults to USD). Fraction digits
 * follow the currency's own convention (e.g. 2 for USD/EUR, 0 for JPY) via Intl.
 */
export function formatFiat(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

export function formatUsd(value: number): string {
  return formatFiat(value, 'USD');
}

/** Signed fiat, e.g. "+$12.34" / "-€5.00". */
export function formatSignedFiat(value: number, currency = 'USD'): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatFiat(Math.abs(value), currency)}`;
}

/** Signed USD, e.g. "+$12.34" / "-$5.00". */
export function formatSignedUsd(value: number): string {
  return formatSignedFiat(value, 'USD');
}

export function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
