import { describe, expect, it } from 'vitest';

import {
  computePortfolio,
  formatPercent,
  formatTokenAmount,
  formatUsd,
  toDecimalNumber,
} from '../index';

describe('formatTokenAmount', () => {
  it('formats and trims base units precisely', () => {
    expect(formatTokenAmount(150_000_000n, 8)).toBe('1.5');
    expect(formatTokenAmount(10n ** 18n, 18)).toBe('1');
    expect(formatTokenAmount(4_200_000n, 8)).toBe('0.042');
    expect(formatTokenAmount(0n, 9)).toBe('0');
  });

  it('respects max fraction digits without float error on large values', () => {
    // 0.85 ETH in wei — would lose precision via naive Number().
    expect(toDecimalNumber(850_000_000_000_000_000n, 18)).toBe(0.85);
  });
});

describe('formatUsd / formatPercent', () => {
  it('formats currency and signed percentages', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatPercent(2.345)).toBe('+2.35%');
    expect(formatPercent(-1.2)).toBe('-1.20%');
  });
});

describe('computePortfolio', () => {
  const portfolio = computePortfolio([
    // 0.5 BTC @ $60,000, +10% over 24h
    { chain: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', amount: 50_000_000n, decimals: 8, priceUsd: 60_000, change24hPct: 10 },
    // 2 ETH @ $3,000, -5% over 24h
    { chain: 'ethereum', symbol: 'ETH', name: 'Ethereum', amount: 2n * 10n ** 18n, decimals: 18, priceUsd: 3_000, change24hPct: -5 },
  ]);

  it('values each position', () => {
    const btc = portfolio.positions.find((p) => p.symbol === 'BTC')!;
    const eth = portfolio.positions.find((p) => p.symbol === 'ETH')!;
    expect(btc.valueUsd).toBeCloseTo(30_000, 6);
    expect(eth.valueUsd).toBeCloseTo(6_000, 6);
  });

  it('sorts holdings by value (largest first)', () => {
    expect(portfolio.positions[0]!.symbol).toBe('BTC');
  });

  it('computes allocation shares that sum to 100%', () => {
    const sum = portfolio.positions.reduce((s, p) => s + p.allocationPct, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('aggregates total and 24h change correctly', () => {
    expect(portfolio.totalUsd).toBeCloseTo(36_000, 6);
    // prev: BTC 30000/1.1 = 27272.73 ; ETH 6000/0.95 = 6315.79 ; total ≈ 33588.52
    expect(portfolio.total24hAgoUsd).toBeCloseTo(33_588.52, 1);
    expect(portfolio.change24hUsd).toBeCloseTo(2_411.48, 1);
    expect(portfolio.change24hPct).toBeCloseTo(7.18, 1);
  });

  it('handles an empty portfolio without dividing by zero', () => {
    const empty = computePortfolio([]);
    expect(empty.totalUsd).toBe(0);
    expect(empty.change24hPct).toBe(0);
  });
});
