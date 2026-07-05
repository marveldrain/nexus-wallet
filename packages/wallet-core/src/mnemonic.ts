/**
 * BIP39 mnemonic generation, validation, and seed derivation.
 *
 * We use @scure/bip39 (audited, zero-dependency, maintained by paulmillr).
 * Entropy comes from @scure/bip39's internal use of the platform CSPRNG.
 */
import {
  generateMnemonic as scureGenerate,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

import { InvalidMnemonicError } from './errors';

/** 128 bits → 12 words, 256 bits → 24 words. We default to 24 for max security. */
export type MnemonicStrength = 128 | 256;

/**
 * Generate a fresh BIP39 mnemonic.
 * @param strength 128 (12 words) or 256 (24 words). Defaults to 256.
 */
export function generateMnemonic(strength: MnemonicStrength = 256): string {
  return scureGenerate(wordlist, strength);
}

/** Returns true if `mnemonic` is a valid BIP39 phrase (checksum + wordlist). */
export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(normalizeMnemonic(mnemonic), wordlist);
}

/**
 * Derive the 64-byte BIP39 seed from a mnemonic and OPTIONAL BIP39 passphrase
 * (the "25th word"). The passphrase creates a hidden wallet — losing it is
 * unrecoverable, so the UI must warn the user clearly.
 *
 * @throws {InvalidMnemonicError} if the phrase fails validation.
 */
export function mnemonicToSeed(mnemonic: string, passphrase = ''): Uint8Array {
  const normalized = normalizeMnemonic(mnemonic);
  if (!validateMnemonic(normalized, wordlist)) {
    throw new InvalidMnemonicError();
  }
  // BIP39 itself NFKD-normalizes the passphrase internally.
  return mnemonicToSeedSync(normalized, passphrase);
}

/** Collapse whitespace and lowercase — tolerant of copy/paste artifacts. */
function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}
