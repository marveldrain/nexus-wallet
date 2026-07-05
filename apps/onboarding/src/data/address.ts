/** Per-chain recipient address validation. */
import { isAddress } from 'viem';
import { PublicKey } from '@solana/web3.js';
import type { ChainId } from '@nexus/wallet-core';

export function isValidAddress(chain: ChainId, address: string): boolean {
  const a = address.trim();
  if (!a) return false;

  switch (chain) {
    case 'ethereum':
      return isAddress(a);
    case 'solana':
      try {
        // PublicKey throws on bad base58/length.
        return new PublicKey(a).toBase58().length >= 32;
      } catch {
        return false;
      }
    case 'bitcoin':
      // Mainnet bech32 (bc1…) / legacy (1…/3…), or testnet bech32 (tb1…) /
      // legacy (m…/n…/2…) — accepted regardless of the app's current network
      // mode so a mismatch surfaces as a clear build/sign error (tx-builder's
      // network-aware encoding), not a silent UI rejection. The tx builder
      // does the final, authoritative validation when constructing the output.
      return (
        /^bc1[0-9ac-hj-np-z]{20,71}$/.test(a) ||
        /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a) ||
        /^tb1[0-9ac-hj-np-z]{20,71}$/.test(a) ||
        /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)
      );
    default:
      return false;
  }
}
