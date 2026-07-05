/**
 * Solana.
 *
 * Curve:      ed25519  (NOT secp256k1 — so BIP32 does not apply here)
 * Derivation: SLIP-0010 over ed25519, path m/44'/501'/{index}'/0'
 *             (all segments hardened — ed25519 only supports hardened keys).
 *             This matches Phantom/Solflare's default account scheme.
 * Address:    base58 of the 32-byte ed25519 public key.
 */
import { Keypair } from '@solana/web3.js';
import { bytesToHex } from '@noble/hashes/utils';
import { derivePath } from 'ed25519-hd-key';

import { KeyringLockedError } from '../errors';
import type { ChainAdapter, DerivedAccount } from './types';

export const solanaAdapter: ChainAdapter = {
  id: 'solana',
  name: 'Solana',
  ticker: 'SOL',
  decimals: 9,

  derivationPath(index: number): string {
    return `m/44'/501'/${index}'/0'`;
  },

  deriveAccount(seed: Uint8Array, index: number): DerivedAccount {
    const path = this.derivationPath(index);
    // ed25519-hd-key takes a hex seed and returns the 32-byte private seed.
    const { key } = derivePath(path, bytesToHex(seed));
    if (!key || key.length !== 32) {
      throw new KeyringLockedError('Failed to derive a Solana private key.');
    }

    const keypair = Keypair.fromSeed(Uint8Array.from(key));

    return {
      chain: 'solana',
      index,
      path,
      address: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBytes(),
      // Solana's secretKey is the 64-byte (seed || pubkey) form used by signers.
      privateKey: keypair.secretKey,
    };
  },
};
