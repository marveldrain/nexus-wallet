/**
 * Keyring — the in-memory, *unlocked* representation of a wallet.
 *
 * It holds the BIP39 seed in a private field for the duration of an unlocked
 * session and derives chain accounts on demand. Call `lock()` (or rely on the
 * app's auto-lock) to wipe the seed the moment it's no longer needed.
 *
 * The seed never leaves this object; only public addresses and (deliberately,
 * transiently) private keys for an active signing operation flow outward.
 */
import { CHAIN_ADAPTERS, deriveBitcoinTestnetAccount } from './chains';
import type { ChainId, DerivedAccount } from './chains/types';
import { KeyringLockedError, UnsupportedChainError } from './errors';
import { mnemonicToSeed } from './mnemonic';
import { wipe } from './crypto/random';

export class Keyring {
  // `#seed` is a true private field — inaccessible from outside, not enumerable,
  // and not serialized by JSON.stringify.
  #seed: Uint8Array | null;

  private constructor(seed: Uint8Array) {
    this.#seed = seed;
  }

  /**
   * Build a Keyring from a mnemonic (+ optional BIP39 passphrase).
   * @throws {InvalidMnemonicError} for an invalid phrase.
   */
  static fromMnemonic(mnemonic: string, passphrase = ''): Keyring {
    return new Keyring(mnemonicToSeed(mnemonic, passphrase));
  }

  get isLocked(): boolean {
    return this.#seed === null;
  }

  /**
   * Derive the account for `chain` at `index`.
   * @throws {KeyringLockedError}     if the keyring has been locked.
   * @throws {UnsupportedChainError}  if the chain isn't registered.
   */
  deriveAccount(chain: ChainId, index = 0): DerivedAccount {
    if (this.#seed === null) throw new KeyringLockedError();
    const adapter = CHAIN_ADAPTERS[chain];
    if (!adapter) throw new UnsupportedChainError(chain);
    return adapter.deriveAccount(this.#seed, index);
  }

  /** Derive a contiguous range [start, start+count) of accounts for a chain. */
  deriveAccounts(chain: ChainId, count: number, start = 0): DerivedAccount[] {
    return Array.from({ length: count }, (_, i) => this.deriveAccount(chain, start + i));
  }

  /**
   * Derive just the address for `chain`/`index`, without ever returning the
   * private key to the caller — it's wiped before this method returns. Prefer
   * this over `deriveAccount` whenever only the address is needed (account
   * lists/previews, "what address is this?" UI), since it never lets a
   * private key escape into a screen/render path that doesn't need it.
   */
  deriveAddress(chain: ChainId, index = 0): string {
    const account = this.deriveAccount(chain, index);
    try {
      return account.address;
    } finally {
      wipe(account.privateKey);
    }
  }

  /**
   * Derive a Bitcoin TESTNET account ("tb1q..."), for Phase-3 QA against
   * public testnet faucets/explorers without risking real funds. Deliberately
   * a separate method (not reachable via `deriveAccount('bitcoin', …)`) so a
   * caller can't mix up mainnet and testnet derivation by passing the wrong
   * chain id.
   * @throws {KeyringLockedError} if the keyring has been locked.
   */
  deriveBitcoinTestnetAccount(index = 0): DerivedAccount {
    if (this.#seed === null) throw new KeyringLockedError();
    return deriveBitcoinTestnetAccount(this.#seed, index);
  }

  /** Address-only variant of `deriveBitcoinTestnetAccount` — see `deriveAddress`. */
  deriveBitcoinTestnetAddress(index = 0): string {
    const account = this.deriveBitcoinTestnetAccount(index);
    try {
      return account.address;
    } finally {
      wipe(account.privateKey);
    }
  }

  /** Zeroize and release the seed. Idempotent. */
  lock(): void {
    if (this.#seed) {
      wipe(this.#seed);
      this.#seed = null;
    }
  }
}
