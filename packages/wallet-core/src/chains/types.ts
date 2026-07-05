/**
 * Chain abstraction. Adding a new chain = implement one `ChainAdapter` and
 * register it. Nothing else in the core needs to change.
 */

export type ChainId = 'ethereum' | 'bitcoin' | 'solana';

/**
 * A derived, address-bearing account. `privateKey` is sensitive — callers
 * MUST `wipe()` it as soon as signing completes and never persist it.
 */
export interface DerivedAccount {
  chain: ChainId;
  /** Account index within the HD tree. */
  index: number;
  /** Full BIP32/SLIP-0010 derivation path used. */
  path: string;
  /** The public, shareable address (checksummed/encoded per chain). */
  address: string;
  /** Raw public key bytes. */
  publicKey: Uint8Array;
  /** Raw private key bytes. SENSITIVE — wipe after use. */
  privateKey: Uint8Array;
}

export interface ChainAdapter {
  readonly id: ChainId;
  readonly name: string;
  /** Native currency ticker, e.g. ETH/BTC/SOL. */
  readonly ticker: string;
  /** Smallest-unit decimals (18 ETH, 8 BTC, 9 SOL). */
  readonly decimals: number;

  /** The default derivation path for the given account index. */
  derivationPath(index: number): string;

  /**
   * Derive an account from the 64-byte BIP39 seed.
   * Implementations select the correct curve (secp256k1 vs ed25519) and
   * derivation scheme (BIP32 vs SLIP-0010) for the chain.
   */
  deriveAccount(seed: Uint8Array, index: number): DerivedAccount;
}
