/**
 * Pure portfolio valuation. No network, no side effects — given holdings and
 * prices it computes per-asset USD values, allocation, and aggregate 24h change.
 * Fully deterministic and unit-tested.
 */
import { toDecimalNumber } from './format';

export interface PositionInput {
  /** Chain id, e.g. "bitcoin" | "ethereum" | "solana". */
  chain: string;
  symbol: string;
  name: string;
  /** Holding amount in smallest units (sats/wei/lamports). */
  amount: bigint;
  decimals: number;
  /** Current price in USD. */
  priceUsd: number;
  /** 24h price change, percent (e.g. 2.5 for +2.5%). */
  change24hPct: number;
}

export interface Position extends PositionInput {
  /** Human-readable holding amount. */
  amountDecimal: number;
  /** Current USD value of the holding. */
  valueUsd: number;
  /** USD value 24h ago (back-computed from the price change). */
  value24hAgoUsd: number;
  /** Share of the total portfolio, percent. */
  allocationPct: number;
}

export interface Portfolio {
  positions: Position[];
  totalUsd: number;
  total24hAgoUsd: number;
  change24hUsd: number;
  change24hPct: number;
}

export function computePortfolio(inputs: PositionInput[]): Portfolio {
  const valued = inputs.map((input) => {
    const amountDecimal = toDecimalNumber(input.amount, input.decimals);
    const valueUsd = amountDecimal * input.priceUsd;
    // priceNow = pricePrev * (1 + change/100)  ⇒  valuePrev = valueNow / (1 + change/100)
    const value24hAgoUsd = valueUsd / (1 + input.change24hPct / 100);
    return { ...input, amountDecimal, valueUsd, value24hAgoUsd };
  });

  const totalUsd = valued.reduce((sum, p) => sum + p.valueUsd, 0);
  const total24hAgoUsd = valued.reduce((sum, p) => sum + p.value24hAgoUsd, 0);
  const change24hUsd = totalUsd - total24hAgoUsd;
  const change24hPct = total24hAgoUsd > 0 ? (change24hUsd / total24hAgoUsd) * 100 : 0;

  const positions: Position[] = valued
    .map((p) => ({ ...p, allocationPct: totalUsd > 0 ? (p.valueUsd / totalUsd) * 100 : 0 }))
    .sort((a, b) => b.valueUsd - a.valueUsd);

  return { positions, totalUsd, total24hAgoUsd, change24hUsd, change24hPct };
}
