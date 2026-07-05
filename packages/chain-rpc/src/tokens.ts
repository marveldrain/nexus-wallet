/**
 * Token discovery — find the ERC-20 / SPL tokens an address holds.
 *
 *  - Ethereum: Blockscout `/api/v2/addresses/{addr}/token-balances` auto-discovers
 *    every ERC-20 with full metadata (symbol, decimals, balance). Free, CORS-ok.
 *  - Solana: `getTokenAccountsByOwner`. NOTE: this RPC method is blocked on many
 *    free public endpoints (publicnode 403s it); a keyed RPC (Helius/Alchemy/
 *    QuickNode) is recommended. Callers should treat failure as "no SPL tokens".
 */
import { createPublicClient, erc20Abi, fallback, http, isAddress } from 'viem';
import { fetchJson } from './http';

export interface TokenBalance {
  chain: string;
  /** ERC-20 contract address or SPL mint. */
  contract: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Raw balance in smallest units. */
  amount: bigint;
}

// --- Ethereum (Blockscout) ---------------------------------------------------
interface BlockscoutTokenBalance {
  token: {
    address: string;
    symbol: string | null;
    name: string | null;
    decimals: string | null;
    type: string;
  };
  value: string;
}

export async function getEvmTokens(
  blockscoutBaseUrl: string,
  address: string,
): Promise<TokenBalance[]> {
  const data = await fetchJson<BlockscoutTokenBalance[]>(
    [blockscoutBaseUrl],
    `/api/v2/addresses/${address}/token-balances`,
  );
  return (data ?? [])
    .filter(
      (t) =>
        t.token?.type === 'ERC-20' &&
        t.token.address &&
        t.token.symbol &&
        t.token.decimals &&
        t.value &&
        BigInt(t.value) > 0n,
    )
    .map((t) => ({
      chain: 'ethereum',
      contract: t.token.address.toLowerCase(),
      symbol: t.token.symbol!,
      name: t.token.name ?? t.token.symbol!,
      decimals: Number(t.token.decimals),
      amount: BigInt(t.value),
    }));
}

/**
 * Read a single ERC-20's metadata + an owner's balance directly from the
 * contract (for user-added "custom" tokens). Returns null if the contract isn't
 * a readable ERC-20.
 */
export async function getErc20TokenInfo(
  rpcUrls: string[],
  contract: string,
  owner: string,
): Promise<TokenBalance | null> {
  if (!isAddress(contract) || !isAddress(owner)) return null;
  try {
    const client = createPublicClient({ transport: fallback(rpcUrls.map((u) => http(u))) });
    const base = { address: contract as `0x${string}`, abi: erc20Abi } as const;
    const [symbol, name, decimals, balance] = await Promise.all([
      client.readContract({ ...base, functionName: 'symbol' }),
      client.readContract({ ...base, functionName: 'name' }),
      client.readContract({ ...base, functionName: 'decimals' }),
      client.readContract({ ...base, functionName: 'balanceOf', args: [owner as `0x${string}`] }),
    ]);
    return {
      chain: 'ethereum',
      contract: contract.toLowerCase(),
      symbol,
      name,
      decimals: Number(decimals),
      amount: balance,
    };
  } catch {
    return null;
  }
}

// --- Solana (getTokenAccountsByOwner) ----------------------------------------
const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/** A few well-known mints so common holdings show a real symbol. */
const KNOWN_SPL_MINTS: Record<string, { symbol: string; name: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', name: 'USD Coin' },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT', name: 'Tether USD' },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': { symbol: 'ETH', name: 'Wrapped Ether (Wormhole)' },
};

interface SolTokenAccount {
  account: {
    data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number } } } };
  };
}

export async function getSolanaTokens(rpcUrls: string[], owner: string): Promise<TokenBalance[]> {
  const res = await fetchJson<{ result?: { value?: SolTokenAccount[] } }>(rpcUrls, '', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [owner, { programId: SPL_TOKEN_PROGRAM }, { encoding: 'jsonParsed' }],
    }),
  });

  return (res.result?.value ?? [])
    .map((a) => a.account.data.parsed.info)
    .filter((info) => BigInt(info.tokenAmount.amount) > 0n)
    .map((info) => {
      const known = KNOWN_SPL_MINTS[info.mint];
      return {
        chain: 'solana',
        contract: info.mint,
        symbol: known?.symbol ?? `${info.mint.slice(0, 4)}…`,
        name: known?.name ?? 'SPL Token',
        decimals: info.tokenAmount.decimals,
        amount: BigInt(info.tokenAmount.amount),
      };
    });
}
