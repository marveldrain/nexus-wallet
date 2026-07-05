/**
 * Portfolio data source.
 *
 *  - `getLivePortfolio()` reads REAL balances from @nexus/chain-rpc and REAL
 *    prices from CoinGecko, then values them with @nexus/portfolio. This is the
 *    default (config.USE_LIVE).
 *  - `getMockPortfolio()` is an offline fallback for demos / no-network dev.
 *
 * Per-chain balance failures are isolated (Promise.allSettled): one chain being
 * down still shows the others.
 */
import type { ChainId } from '@nexus/wallet-core';
import { BitcoinRpc, EvmRpc, SolanaRpc } from '@nexus/chain-rpc';
import {
  CoinGeckoPriceSource,
  computePortfolio,
  toDecimalNumber,
  type Portfolio,
  type PositionInput,
  type PriceQuote,
} from '@nexus/portfolio';
import { COINGECKO_BASE, COINGECKO_KEY, RPC, TESTNET_RPC } from '../config';
import { EVM_NETWORKS, SEPOLIA } from './networks';
import type { NetworkMode } from './settings';

export interface PortfolioSnapshot {
  portfolio: Portfolio;
  valueSeries: number[];
}

export interface AccountRef {
  chain: ChainId;
  address: string;
}

interface PositionTask {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  coingeckoId: string;
  balance: Promise<bigint>;
}

/**
 * Live, multi-chain portfolio. The Ethereum account is valued across EVERY EVM
 * network (same address), plus native Bitcoin and Solana.
 *
 * Testnet mode (`networkMode: 'testnet'`) swaps to exactly three networks —
 * Bitcoin testnet3, Ethereum Sepolia, Solana devnet — and skips pricing
 * entirely (test tokens have no real value, so showing a fake $ amount would
 * be actively misleading). It's a QA tool, not a mirror of every mainnet
 * feature: no EVM L2 expansion, no token discovery in this mode.
 */
export async function getLivePortfolio(
  accounts: AccountRef[],
  currency = 'usd',
  networkMode: NetworkMode = 'mainnet',
): Promise<PortfolioSnapshot> {
  const testnet = networkMode === 'testnet';
  const tasks: PositionTask[] = [];
  for (const a of accounts) {
    if (a.chain === 'bitcoin') {
      const apiUrls = testnet ? TESTNET_RPC.bitcoin : RPC.bitcoin;
      tasks.push({ id: 'bitcoin', name: testnet ? 'Bitcoin (Testnet)' : 'Bitcoin', symbol: 'BTC', decimals: 8, coingeckoId: 'bitcoin', balance: new BitcoinRpc(apiUrls).getBalance(a.address).catch(() => 0n) });
    } else if (a.chain === 'solana') {
      const rpcUrls = testnet ? TESTNET_RPC.solana : RPC.solana;
      tasks.push({ id: 'solana', name: testnet ? 'Solana (Devnet)' : 'Solana', symbol: 'SOL', decimals: 9, coingeckoId: 'solana', balance: new SolanaRpc(rpcUrls).getBalance(a.address).catch(() => 0n) });
    } else if (a.chain === 'ethereum') {
      const networks = testnet ? [SEPOLIA] : EVM_NETWORKS;
      for (const net of networks) {
        tasks.push({
          id: net.id,
          name: net.name,
          symbol: net.symbol,
          decimals: net.decimals,
          coingeckoId: net.coingeckoId,
          balance: new EvmRpc(net.rpcUrls, net.chainId).getBalance(a.address as `0x${string}`).catch(() => 0n),
        });
      }
    }
  }

  const priceSource = new CoinGeckoPriceSource(COINGECKO_BASE, COINGECKO_KEY);
  const uniqueIds = [...new Set(tasks.map((t) => t.coingeckoId))];
  const [balances, prices] = await Promise.all([
    Promise.all(tasks.map((t) => t.balance)),
    testnet
      ? Promise.resolve({} as Record<string, PriceQuote>)
      : priceSource.getPricesByIds(uniqueIds, currency).catch(() => ({}) as Record<string, PriceQuote>),
  ]);

  const inputs: PositionInput[] = tasks.map((t, i) => {
    const price = prices[t.coingeckoId];
    return {
      chain: t.id,
      symbol: t.symbol,
      name: t.name,
      amount: balances[i] ?? 0n,
      decimals: t.decimals,
      priceUsd: price?.usd ?? 0,
      change24hPct: price?.change24hPct ?? 0,
    };
  });

  const portfolio = computePortfolio(inputs);

  if (testnet) {
    // Test funds have no real value — a flat-zero chart is the honest one.
    return { portfolio, valueSeries: new Array(48).fill(0) };
  }

  const heldHoldings = tasks
    .map((t, i) => ({ coingeckoId: t.coingeckoId, amountDecimal: toDecimalNumber(balances[i] ?? 0n, t.decimals) }))
    .filter((h) => h.amountDecimal > 0);

  const valueSeries =
    heldHoldings.length > 0 ? await getValueHistory(heldHoldings, priceSource, currency).catch(() => null) : null;

  return {
    portfolio,
    valueSeries: valueSeries ?? synthSeries(portfolio.totalUsd, portfolio.change24hPct),
  };
}

/**
 * Real 24h portfolio value history: for each currently-held asset, fetch its
 * hourly price history and multiply by the CURRENT holding amount (we don't
 * track historical balances, so this assumes holdings were constant over the
 * window — the same simplification most wallet 24h charts make).
 */
async function getValueHistory(
  holdings: Array<{ coingeckoId: string; amountDecimal: number }>,
  priceSource: CoinGeckoPriceSource,
  currency: string,
): Promise<number[] | null> {
  const uniqueIds = [...new Set(holdings.map((h) => h.coingeckoId))];
  const series = await Promise.all(
    uniqueIds.map((id) => priceSource.getMarketChart(id, currency, 1).catch(() => null)),
  );

  const byId = new Map<string, Array<[number, number]>>();
  uniqueIds.forEach((id, i) => {
    const points = series[i];
    if (points && points.length > 0) byId.set(id, points);
  });
  if (byId.size === 0) return null;

  const minLength = Math.min(...[...byId.values()].map((p) => p.length));
  if (minLength < 2) return null;

  const result: number[] = [];
  for (let i = 0; i < minLength; i++) {
    let total = 0;
    for (const h of holdings) {
      const points = byId.get(h.coingeckoId);
      total += points ? points[i]![1] * h.amountDecimal : 0;
    }
    result.push(total);
  }
  return result;
}

/** Offline demo holdings (amounts in smallest units). */
export async function getMockPortfolio(): Promise<PortfolioSnapshot> {
  await new Promise((r) => setTimeout(r, 450));
  const portfolio = computePortfolio([
    { chain: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', amount: 4_200_000n, decimals: 8, priceUsd: 64_210.34, change24hPct: 2.41 },
    { chain: 'ethereum', symbol: 'ETH', name: 'Ethereum', amount: 850_000_000_000_000_000n, decimals: 18, priceUsd: 3_415.88, change24hPct: -1.18 },
    { chain: 'solana', symbol: 'SOL', name: 'Solana', amount: 24_500_000_000n, decimals: 9, priceUsd: 168.42, change24hPct: 5.73 },
  ]);
  return { portfolio, valueSeries: synthSeries(portfolio.totalUsd, portfolio.change24hPct) };
}

/**
 * Fallback synthetic series — used only when real history is unavailable
 * (empty wallet, offline mock mode, or the market_chart fetch failed).
 * Deterministically trends from the 24h-ago value up to the current total.
 */
function synthSeries(end: number, change24hPct: number, points = 48): number[] {
  if (end <= 0) return new Array(points).fill(0);
  const start = end / (1 + change24hPct / 100);
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const series: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = start + (end - start) * t;
    const noise = (rand() - 0.5) * end * 0.012;
    series.push(Math.max(0, trend + noise));
  }
  series[points - 1] = end;
  return series;
}
