/**
 * EVM network registry.
 *
 * The user's single Ethereum address is valid on EVERY EVM chain, so we value
 * it across all of these networks. Adding a chain = one entry here. RPC URLs are
 * env-overridable (VITE_<CHAIN>_RPC_URLS); defaults are CORS-friendly publicnode.
 */
const env = import.meta.env as Record<string, string | undefined>;
const list = (v: string | undefined, fb: string[]): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fb;

export interface EvmNetwork {
  id: string;
  name: string;
  /** Native currency symbol. */
  symbol: string;
  coingeckoId: string;
  chainId: number;
  rpcUrls: string[];
  explorerTx: string;
  decimals: number;
  glyph: string;
  ring: string;
  bg: string;
}

export const EVM_NETWORKS: EvmNetwork[] = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', coingeckoId: 'ethereum', chainId: 1, rpcUrls: list(env.VITE_ETH_RPC_URLS, ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org']), explorerTx: 'https://etherscan.io/tx/', decimals: 18, glyph: 'Ξ', ring: 'text-indigo-300', bg: 'bg-indigo-400/10' },
  { id: 'polygon', name: 'Polygon', symbol: 'POL', coingeckoId: 'matic-network', chainId: 137, rpcUrls: list(env.VITE_POLYGON_RPC_URLS, ['https://polygon-bor-rpc.publicnode.com']), explorerTx: 'https://polygonscan.com/tx/', decimals: 18, glyph: '⬡', ring: 'text-violet-300', bg: 'bg-violet-400/10' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', coingeckoId: 'binancecoin', chainId: 56, rpcUrls: list(env.VITE_BSC_RPC_URLS, ['https://bsc-rpc.publicnode.com']), explorerTx: 'https://bscscan.com/tx/', decimals: 18, glyph: '◆', ring: 'text-amber-300', bg: 'bg-amber-400/10' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', coingeckoId: 'ethereum', chainId: 42161, rpcUrls: list(env.VITE_ARBITRUM_RPC_URLS, ['https://arbitrum-one-rpc.publicnode.com']), explorerTx: 'https://arbiscan.io/tx/', decimals: 18, glyph: '◅', ring: 'text-sky-300', bg: 'bg-sky-400/10' },
  { id: 'optimism', name: 'Optimism', symbol: 'ETH', coingeckoId: 'ethereum', chainId: 10, rpcUrls: list(env.VITE_OPTIMISM_RPC_URLS, ['https://optimism-rpc.publicnode.com']), explorerTx: 'https://optimistic.etherscan.io/tx/', decimals: 18, glyph: '○', ring: 'text-rose-300', bg: 'bg-rose-400/10' },
  { id: 'base', name: 'Base', symbol: 'ETH', coingeckoId: 'ethereum', chainId: 8453, rpcUrls: list(env.VITE_BASE_RPC_URLS, ['https://base-rpc.publicnode.com']), explorerTx: 'https://basescan.org/tx/', decimals: 18, glyph: '◐', ring: 'text-blue-300', bg: 'bg-blue-400/10' },
  { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', coingeckoId: 'avalanche-2', chainId: 43114, rpcUrls: list(env.VITE_AVALANCHE_RPC_URLS, ['https://avalanche-c-chain-rpc.publicnode.com']), explorerTx: 'https://snowtrace.io/tx/', decimals: 18, glyph: '▲', ring: 'text-red-300', bg: 'bg-red-400/10' },
];

export const EVM_NETWORK_IDS = new Set(EVM_NETWORKS.map((n) => n.id));

/**
 * Sepolia — the only EVM network used in testnet mode. Shares the mainnet
 * Ethereum address (EVM addresses are chain-agnostic); only chainId/RPC/
 * explorer differ. `coingeckoId` is unused here — testnet mode never prices
 * assets (test tokens have no real value).
 */
export const SEPOLIA: EvmNetwork = {
  id: 'sepolia',
  name: 'Sepolia',
  symbol: 'ETH',
  coingeckoId: 'ethereum',
  chainId: 11_155_111,
  rpcUrls: list(env.VITE_SEPOLIA_RPC_URLS, [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
  ]),
  explorerTx: 'https://sepolia.etherscan.io/tx/',
  decimals: 18,
  glyph: 'Ξ',
  ring: 'text-indigo-300',
  bg: 'bg-indigo-400/10',
};

/** Display style per asset chain id (native chains + every EVM network). */
export const ASSET_META: Record<string, { glyph: string; ring: string; bg: string }> = {
  bitcoin: { glyph: '₿', ring: 'text-amber-400', bg: 'bg-amber-400/10' },
  solana: { glyph: '◎', ring: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10' },
  sepolia: { glyph: SEPOLIA.glyph, ring: SEPOLIA.ring, bg: SEPOLIA.bg },
  ...Object.fromEntries(EVM_NETWORKS.map((n) => [n.id, { glyph: n.glyph, ring: n.ring, bg: n.bg }])),
};
