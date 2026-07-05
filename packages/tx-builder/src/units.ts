/**
 * Decimal-string → smallest-unit (bigint) conversion.
 *
 * We ALWAYS handle on-chain amounts as bigint in the smallest unit (wei, sats,
 * lamports) — never floats — to avoid rounding errors that could lose funds.
 */
import { parseUnits } from 'viem';
import { InvalidAmountError } from './errors';

const STRICT_DECIMAL = /^\d+(\.\d+)?$/;

/**
 * Validate a decimal string the SAME strict way for every chain: digits
 * only, an optional single `.`, no leading/trailing dot on its own (no "5.",
 * no ".5"), no sign, no thousands separators, no scientific notation — and
 * no more fractional digits than `decimals` allows. Used by every parser
 * below so "what counts as a valid amount" can't silently drift between
 * chains depending on which underlying library does the final bigint math.
 */
function validateDecimal(value: string, decimals: number): { whole: string; frac: string } {
  const trimmed = value.trim();
  if (!STRICT_DECIMAL.test(trimmed)) {
    throw new InvalidAmountError(`"${value}" is not a valid amount.`);
  }
  const [whole = '0', frac = ''] = trimmed.split('.');
  if (frac.length > decimals) {
    throw new InvalidAmountError(`Too many decimal places (max ${decimals}).`);
  }
  return { whole, frac };
}

/** Parse a decimal string into base units for an arbitrary decimal precision. */
export function parseDecimalToBaseUnits(value: string, decimals: number): bigint {
  const { whole, frac } = validateDecimal(value, decimals);
  const fracPadded = frac.padEnd(decimals, '0');
  const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
  if (result <= 0n) throw new InvalidAmountError();
  return result;
}

/**
 * ETH/EVM: decimal ether (or token units) → wei. Validated through the same
 * strict `validateDecimal` as every other chain before delegating the bigint
 * math to viem — without this, viem's `parseUnits` on its own silently
 * accepts "5."/".5" AND silently truncates excess fractional precision
 * instead of rejecting it, which both contradict this module's "never lose
 * precision silently" design.
 */
export function parseEvmAmount(value: string, decimals = 18): bigint {
  const { whole, frac } = validateDecimal(value, decimals);
  try {
    const wei = parseUnits(`${whole}.${frac || '0'}` as `${number}`, decimals);
    if (wei <= 0n) throw new InvalidAmountError();
    return wei;
  } catch (err) {
    if (err instanceof InvalidAmountError) throw err;
    throw new InvalidAmountError(`"${value}" is not a valid amount.`);
  }
}

/** BTC: decimal bitcoin → satoshis. */
export const parseBtcToSats = (value: string): bigint => parseDecimalToBaseUnits(value, 8);

/** SOL: decimal sol → lamports. */
export const parseSolToLamports = (value: string): bigint => parseDecimalToBaseUnits(value, 9);
