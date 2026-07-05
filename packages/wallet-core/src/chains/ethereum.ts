/**
 * Ethereum + all EVM chains (Polygon, BSC, Arbitrum, ...).
 *
 * Curve:      secp256k1
 * Derivation: BIP32, path m/44'/60'/0'/0/{index} (BIP44, coin type 60)
 * Address:    keccak256(pubkey)[-20:], EIP-55 checksummed — handled by viem.
 *
 * The SAME keypair/address is valid on every EVM chain; only the RPC and
 * chainId differ at send-time, so a single adapter covers them all.
 */
import { HDKey } from '@scure/bip32';
import { bytesToHex } from '@noble/hashes/utils';
import { privateKeyToAccount } from 'viem/accounts';

import { KeyringLockedError } from '../errors';
import type { ChainAdapter, DerivedAccount } from './types';

export const ethereumAdapter: ChainAdapter = {
  id: 'ethereum',
  name: 'Ethereum',
  ticker: 'ETH',
  decimals: 18,

  derivationPath(index: number): string {
    return `m/44'/60'/0'/0/${index}`;
  },

  deriveAccount(seed: Uint8Array, index: number): DerivedAccount {
    const path = this.derivationPath(index);
    const node = HDKey.fromMasterSeed(seed).derive(path);
    if (!node.privateKey || !node.publicKey) {
      // Should never happen for a valid private derivation path.
      throw new KeyringLockedError('Failed to derive an Ethereum private key.');
    }

    const account = privateKeyToAccount(`0x${bytesToHex(node.privateKey)}`);

    return {
      chain: 'ethereum',
      index,
      path,
      address: account.address, // EIP-55 checksummed
      publicKey: node.publicKey,
      privateKey: node.privateKey,
    };
  },
};
