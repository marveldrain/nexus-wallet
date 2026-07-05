/**
 * Runtime configuration. Production deployments override these via Vite env
 * vars (VITE_*) — see .env.example. Defaults are healthy public endpoints so
 * the app is operational out of the box.
 */
const env = import.meta.env as Record<string, string | undefined>;

function list(value: string | undefined, fallback: string[]): string[] {
  return value
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : fallback;
}

export const RPC = {
  bitcoin: list(env.VITE_BTC_API_URLS, ['https://blockstream.info/api', 'https://mempool.space/api']),
  ethereum: list(env.VITE_ETH_RPC_URLS, [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.drpc.org',
    'https://eth-mainnet.public.blastapi.io',
  ]),
  // NOTE: the official api.mainnet-beta.solana.com returns 403 for browser
  // origins — publicnode allows CORS and is used as the browser default.
  solana: list(env.VITE_SOL_RPC_URLS, [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ]),
  ethChainId: Number(env.VITE_ETH_CHAIN_ID ?? '1'),
};

export const COINGECKO_BASE = env.VITE_COINGECKO_BASE ?? 'https://api.coingecko.com/api/v3';
export const COINGECKO_KEY = env.VITE_COINGECKO_KEY;

/** Ethereum history indexer (a plain RPC can't list address history). */
export const BLOCKSCOUT_BASE = env.VITE_ETH_HISTORY_URL ?? 'https://eth.blockscout.com';

/**
 * Testnet/devnet endpoints for Phase-3 QA — Bitcoin testnet3, Ethereum
 * Sepolia, Solana devnet. Free, real networks; funds have no monetary value.
 */
export const TESTNET_RPC = {
  bitcoin: list(env.VITE_TESTNET_BTC_API_URLS, [
    'https://blockstream.info/testnet/api',
    'https://mempool.space/testnet/api',
  ]),
  ethereum: list(env.VITE_SEPOLIA_RPC_URLS, [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
  ]),
  solana: list(env.VITE_DEVNET_RPC_URLS, ['https://api.devnet.solana.com']),
  ethChainId: 11_155_111, // Sepolia
};

export const SEPOLIA_BLOCKSCOUT_BASE = env.VITE_SEPOLIA_HISTORY_URL ?? 'https://eth-sepolia.blockscout.com';

/** Live network is the default. Set VITE_USE_LIVE=false for offline/demo mode. */
export const USE_LIVE = (env.VITE_USE_LIVE ?? 'true') !== 'false';
