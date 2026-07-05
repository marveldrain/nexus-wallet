import type { ChainAdapter, ChainId } from './types';
import { bitcoinAdapter, deriveBitcoinTestnetAccount } from './bitcoin';
import { ethereumAdapter } from './ethereum';
import { solanaAdapter } from './solana';

export { deriveBitcoinTestnetAccount };

/** Registry of every supported chain. Add new adapters here to extend support. */
export const CHAIN_ADAPTERS: Record<ChainId, ChainAdapter> = {
  ethereum: ethereumAdapter,
  bitcoin: bitcoinAdapter,
  solana: solanaAdapter,
};

export const SUPPORTED_CHAINS = Object.keys(CHAIN_ADAPTERS) as ChainId[];

export * from './types';
