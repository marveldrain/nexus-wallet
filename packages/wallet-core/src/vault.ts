/**
 * Vault — the high-level, persistence-facing API the app layer uses.
 *
 * Responsibilities:
 *   - create a brand-new wallet (generate entropy → mnemonic → encrypted blob)
 *   - import an existing mnemonic into an encrypted blob
 *   - unlock an encrypted blob back into a live `Keyring`
 *
 * The only thing the app ever writes to disk is the `EncryptedVault` returned
 * here. The plaintext mnemonic exists only transiently and should be wiped by
 * the caller after the user has backed it up.
 */
import {
  DEFAULT_SCRYPT_PARAMS,
  decryptFromVault,
  encryptToVault,
  type EncryptedVault,
  type ScryptParams,
} from './crypto/encryption';
import { Keyring } from './keyring';
import { generateMnemonic, isValidMnemonic, type MnemonicStrength } from './mnemonic';
import { InvalidMnemonicError } from './errors';

export interface CreatedWallet {
  /** The plaintext phrase to show ONCE for backup, then discard. */
  mnemonic: string;
  /** The encrypted blob safe to persist to local storage / disk. */
  vault: EncryptedVault;
}

export interface CreateWalletOptions {
  password: string;
  strength?: MnemonicStrength;
  /** Optional BIP39 passphrase ("25th word") for a hidden wallet. */
  passphrase?: string;
  /** Override scrypt cost (e.g. raise N on desktop). */
  scrypt?: ScryptParams;
}

/**
 * Generate a new wallet and return both the (one-time) mnemonic and the
 * encrypted vault to persist.
 */
export function createWallet(options: CreateWalletOptions): CreatedWallet {
  const { password, strength = 256, passphrase = '', scrypt = DEFAULT_SCRYPT_PARAMS } = options;
  const mnemonic = generateMnemonic(strength);
  const vault = encryptToVault(serializeSecret(mnemonic, passphrase), password, scrypt);
  return { mnemonic, vault };
}

/** Encrypt an externally-supplied mnemonic (wallet import / restore flow). */
export function importMnemonic(
  mnemonic: string,
  password: string,
  passphrase = '',
  scrypt: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): EncryptedVault {
  if (!isValidMnemonic(mnemonic)) throw new InvalidMnemonicError();
  return encryptToVault(serializeSecret(mnemonic, passphrase), password, scrypt);
}

/**
 * Decrypt a vault with the user's password and return a live, unlocked Keyring.
 * @throws {DecryptionFailedError} on wrong password / tampered data.
 */
export function unlockVault(vault: EncryptedVault, password: string): Keyring {
  const { mnemonic, passphrase } = deserializeSecret(decryptFromVault(vault, password));
  return Keyring.fromMnemonic(mnemonic, passphrase);
}

/**
 * Decrypt a vault back to its raw mnemonic + passphrase — needed for "reveal
 * recovery phrase" and "change password" flows, which can't be done through a
 * `Keyring` alone (it deliberately never exposes the seed/mnemonic outward).
 * Callers should treat the returned mnemonic as sensitive and avoid retaining
 * it longer than necessary.
 * @throws {DecryptionFailedError} on wrong password / tampered data.
 */
export function revealMnemonic(
  vault: EncryptedVault,
  password: string,
): { mnemonic: string; passphrase: string } {
  return deserializeSecret(decryptFromVault(vault, password));
}

// --- internal secret envelope ------------------------------------------------
// We store the mnemonic AND any BIP39 passphrase together so unlock fully
// reconstructs the wallet. Kept as a tiny tagged JSON for forward-compat.

interface SecretEnvelope {
  v: 1;
  mnemonic: string;
  passphrase: string;
}

function serializeSecret(mnemonic: string, passphrase: string): string {
  return JSON.stringify({ v: 1, mnemonic, passphrase } satisfies SecretEnvelope);
}

function deserializeSecret(raw: string): { mnemonic: string; passphrase: string } {
  const parsed = JSON.parse(raw) as SecretEnvelope;
  return { mnemonic: parsed.mnemonic, passphrase: parsed.passphrase ?? '' };
}
