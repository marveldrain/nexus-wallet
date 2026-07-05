/**
 * Bitcoin — native SegWit (BIP84) by default for low fees + broad support.
 *
 * Curve:      secp256k1
 * Derivation: BIP32, path m/84'/0'/0'/0/{index} (BIP84, coin type 0)
 * Address:    P2WPKH bech32 ("bc1q...") via @scure/btc-signer.
 *
 * To support Taproot later, add a sibling adapter using m/86'/0'/0'/0/{index}
 * and btc.p2tr(). Legacy/P2SH paths can be added the same way.
 */
import { HDKey } from '@scure/bip32';
import { NETWORK, p2wpkh, TEST_NETWORK } from '@scure/btc-signer';

import { KeyringLockedError } from '../errors';
import type { ChainAdapter, DerivedAccount } from './types';

function deriveBitcoin(
  seed: Uint8Array,
  index: number,
  coinType: number,
  network: typeof NETWORK,
): DerivedAccount {
  const path = `m/84'/${coinType}'/0'/0/${index}`;
  const node = HDKey.fromMasterSeed(seed).derive(path);
  if (!node.privateKey || !node.publicKey) {
    throw new KeyringLockedError('Failed to derive a Bitcoin private key.');
  }

  // node.publicKey is the 33-byte compressed pubkey required for P2WPKH.
  const payment = p2wpkh(node.publicKey, network);
  if (!payment.address) {
    throw new KeyringLockedError('Failed to derive a Bitcoin address.');
  }

  return {
    chain: 'bitcoin',
    index,
    path,
    address: payment.address,
    publicKey: node.publicKey,
    privateKey: node.privateKey,
  };
}

export const bitcoinAdapter: ChainAdapter = {
  id: 'bitcoin',
  name: 'Bitcoin',
  ticker: 'BTC',
  decimals: 8,

  derivationPath(index: number): string {
    return `m/84'/0'/0'/0/${index}`;
  },

  deriveAccount(seed: Uint8Array, index: number): DerivedAccount {
    return deriveBitcoin(seed, index, 0, NETWORK);
  },
};

/**
 * Bitcoin TESTNET — native SegWit ("tb1q...") via BIP84 with SLIP-44's
 * testnet coin type (1', not 0'), per every wallet's convention. Not part of
 * the `ChainAdapter`/`CHAIN_ADAPTERS` registry (that's a mainnet-chain-identity
 * concept) — exposed only via `Keyring.deriveBitcoinTestnetAccount` for
 * Phase-3 testnet QA, so it can't be reached by mainnet code paths by accident.
 */
export function deriveBitcoinTestnetAccount(seed: Uint8Array, index: number): DerivedAccount {
  return deriveBitcoin(seed, index, 1, TEST_NETWORK);
}
