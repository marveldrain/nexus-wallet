/**
 * Token discovery + valuation for the dashboard.
 *
 * Discovers ERC-20 (Blockscout) and SPL (best-effort) holdings, prices them by
 * contract via CoinGecko, and returns only meaningfully-valued tokens (filters
 * out spam / unpriced dust). EVM works on free infra; SPL needs a capable RPC
 * and degrades gracefully if the endpoint blocks getTokenAccountsByOwner.
 */
import type { ChainId } from '@nexus/wallet-core';
import { getErc20TokenInfo, getEvmTokens, getSolanaTokens, type TokenBalance } from '@nexus/chain-rpc';
import { CoinGeckoPriceSource, toDecimalNumber, type PriceQuote } from '@nexus/portfolio';
import { BLOCKSCOUT_BASE, COINGECKO_BASE, COINGECKO_KEY, RPC } from '../config';
import { loadCustomTokens } from './customTokens';
import type { NetworkMode } from './settings';

export interface TokenPosition {
  chain: ChainId;
  contract: string;
  symbol: string;
  name: string;
  decimals: number;
  amount: bigint;
  amountDecimal: number;
  priceUsd: number;
  change24hPct: number;
  valueUsd: number;
  /** True if the user added this token manually (exempt from the dust filter). */
  isCustom: boolean;
}

export interface TokensResult {
  positions: TokenPosition[];
  totalUsd: number;
}

export interface AccountRef {
  chain: ChainId;
  address: string;
}

const MIN_USD = 0.01; // hide spam / unpriced dust
const MAX_TOKENS = 20;

/**
 * Token discovery is a mainnet-only feature for now (ERC-20 auto-discovery +
 * pricing don't have a meaningful testnet equivalent — test tokens have no
 * real value to price, and most testnets don't have a Blockscout instance to
 * discover from). Returns empty immediately in testnet mode.
 */
export async function getTokens(
  accounts: AccountRef[],
  currency = 'usd',
  networkMode: NetworkMode = 'mainnet',
): Promise<TokensResult> {
  if (networkMode === 'testnet') return { positions: [], totalUsd: 0 };

  // 1. Discover balances per chain (failures isolated).
  const discovered = await Promise.all(
    accounts.map(async (a): Promise<TokenBalance[]> => {
      try {
        if (a.chain === 'ethereum') return await getEvmTokens(BLOCKSCOUT_BASE, a.address);
        if (a.chain === 'solana') return await getSolanaTokens(RPC.solana, a.address);
        return [];
      } catch {
        return []; // e.g. SPL endpoint blocks getTokenAccountsByOwner
      }
    }),
  );
  const discoveredBalances = discovered.flat();

  // 1b. User-added custom ERC-20 tokens (Ethereum), read straight from contract.
  const customContracts = loadCustomTokens();
  const customSet = new Set(customContracts.map((c) => c.toLowerCase()));
  const ethAddress = accounts.find((a) => a.chain === 'ethereum')?.address;
  const discoveredEthContracts = new Set(
    discoveredBalances.filter((b) => b.chain === 'ethereum').map((b) => b.contract.toLowerCase()),
  );
  let customBalances: TokenBalance[] = [];
  if (ethAddress && customContracts.length > 0) {
    const infos = await Promise.all(
      customContracts.map((c) => getErc20TokenInfo(RPC.ethereum, c, ethAddress).catch(() => null)),
    );
    customBalances = infos
      .filter((b): b is TokenBalance => b !== null)
      .filter((b) => !discoveredEthContracts.has(b.contract.toLowerCase()));
  }

  const balances = [...discoveredBalances, ...customBalances];
  if (balances.length === 0) return { positions: [], totalUsd: 0 };

  // 2. Price by contract, per platform (custom contracts priced first).
  const priceSource = new CoinGeckoPriceSource(COINGECKO_BASE, COINGECKO_KEY);
  const ethContracts = balances.filter((b) => b.chain === 'ethereum').map((b) => b.contract);
  const orderedEth = [
    ...ethContracts.filter((c) => customSet.has(c.toLowerCase())),
    ...ethContracts.filter((c) => !customSet.has(c.toLowerCase())),
  ];
  const solContracts = balances.filter((b) => b.chain === 'solana').map((b) => b.contract);
  const PRICE_CAP = 80;
  const empty: Record<string, PriceQuote> = {};
  const [ethPrices, solPrices] = await Promise.all([
    priceSource.getTokenPrices('ethereum', orderedEth.slice(0, PRICE_CAP), currency).catch(() => empty),
    priceSource.getTokenPrices('solana', solContracts.slice(0, PRICE_CAP), currency).catch(() => empty),
  ]);

  // 3. Value; keep priced tokens + all custom tokens; sort; cap.
  const positions = balances
    .map((b): TokenPosition => {
      const quote = (b.chain === 'ethereum' ? ethPrices : solPrices)[b.contract.toLowerCase()];
      const amountDecimal = toDecimalNumber(b.amount, b.decimals);
      const priceUsd = quote?.usd ?? 0;
      return {
        chain: b.chain as ChainId,
        contract: b.contract,
        symbol: b.symbol,
        name: b.name,
        decimals: b.decimals,
        amount: b.amount,
        amountDecimal,
        priceUsd,
        change24hPct: quote?.change24hPct ?? 0,
        valueUsd: amountDecimal * priceUsd,
        isCustom: customSet.has(b.contract.toLowerCase()),
      };
    })
    .filter((p) => p.isCustom || p.valueUsd >= MIN_USD)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, MAX_TOKENS);

  const totalUsd = positions.reduce((sum, p) => sum + p.valueUsd, 0);
  return { positions, totalUsd };
}
