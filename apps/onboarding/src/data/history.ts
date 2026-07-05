/**
 * Combined wallet activity — merges per-chain transaction history into one
 * recency-sorted list. Per-chain failures are isolated.
 */
import type { ChainId } from '@nexus/wallet-core';
import {
  getBitcoinHistory,
  getEthereumHistory,
  getSolanaHistory,
  type WalletTransaction,
} from '@nexus/chain-rpc';
import { BLOCKSCOUT_BASE, RPC, SEPOLIA_BLOCKSCOUT_BASE, TESTNET_RPC } from '../config';
import type { NetworkMode } from './settings';

export interface AccountRef {
  chain: ChainId;
  address: string;
}

export async function getActivity(
  accounts: AccountRef[],
  networkMode: NetworkMode = 'mainnet',
): Promise<WalletTransaction[]> {
  const testnet = networkMode === 'testnet';
  const results = await Promise.allSettled(
    accounts.map((a) => {
      switch (a.chain) {
        case 'bitcoin':
          return getBitcoinHistory(testnet ? TESTNET_RPC.bitcoin : RPC.bitcoin, a.address);
        case 'ethereum':
          return getEthereumHistory(testnet ? SEPOLIA_BLOCKSCOUT_BASE : BLOCKSCOUT_BASE, a.address);
        case 'solana':
          return getSolanaHistory(testnet ? TESTNET_RPC.solana : RPC.solana, a.address);
      }
    }),
  );

  return results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => (b.timestamp ?? Infinity) - (a.timestamp ?? Infinity))
    .slice(0, 40);
}
