/**
 * Authenticated, password-based encryption for the local wallet vault.
 *
 * Construction:
 *   KDF    = scrypt (memory-hard, resists GPU/ASIC brute force)
 *   Cipher = XChaCha20-Poly1305 (AEAD; 24-byte random nonce removes any
 *            practical nonce-reuse risk vs AES-GCM's 12-byte nonce)
 *
 * Both primitives come from the audited @noble/* suite. The serialized vault
 * stores all non-secret KDF parameters so it remains decryptable across
 * versions, and is fully self-describing for future migrations.
 *
 * PLATFORM NOTE: On mobile, the password-derived key should additionally be
 * wrapped by the hardware-backed Keychain (iOS) / Keystore (Android) and
 * gated by biometrics. This module is the portable software layer beneath that.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { scrypt } from '@noble/hashes/scrypt';
import { utf8ToBytes } from '@noble/hashes/utils';
import { base64 } from '@scure/base';

import { DecryptionFailedError, VaultCorruptError } from '../errors';
import { secureRandomBytes, wipe } from './random';

/** scrypt cost parameters. Tunable per platform — desktop can safely raise N. */
export interface ScryptParams {
  /** CPU/memory cost. Must be a power of two. Memory ≈ 128 * N * r bytes. */
  N: number;
  /** Block size. */
  r: number;
  /** Parallelization. */
  p: number;
  /** Derived key length in bytes (32 for a 256-bit cipher key). */
  dkLen: number;
}

/**
 * Default params: N=2^16 (~67 MB), a safe cross-platform baseline including
 * mid-range mobile. Desktop/Tauri builds should override to N=2^18 (~268 MB).
 */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 16,
  r: 8,
  p: 1,
  dkLen: 32,
};

export interface EncryptedVault {
  /** Schema version for forward-compatible migrations. */
  version: 1;
  kdf: {
    algorithm: 'scrypt';
    N: number;
    r: number;
    p: number;
    dkLen: number;
    /** base64-encoded random salt. */
    salt: string;
  };
  cipher: 'xchacha20poly1305';
  /** base64-encoded 24-byte nonce. */
  nonce: string;
  /** base64-encoded ciphertext + Poly1305 tag. */
  ciphertext: string;
}

/**
 * Encrypt UTF-8 `plaintext` (e.g. a mnemonic) under `password`.
 * The derived key is wiped from memory immediately after use.
 */
export function encryptToVault(
  plaintext: string,
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): EncryptedVault {
  const salt = secureRandomBytes(16);
  const nonce = secureRandomBytes(24); // XChaCha20 uses a 192-bit nonce.
  const key = deriveKey(password, salt, params);
  const message = utf8ToBytes(plaintext);

  try {
    const ciphertext = xchacha20poly1305(key, nonce).encrypt(message);
    return {
      version: 1,
      kdf: { algorithm: 'scrypt', ...params, salt: base64.encode(salt) },
      cipher: 'xchacha20poly1305',
      nonce: base64.encode(nonce),
      ciphertext: base64.encode(ciphertext),
    };
  } finally {
    wipe(key, message);
  }
}

/**
 * Decrypt a vault back to its UTF-8 plaintext.
 * @throws {VaultCorruptError}    if the structure is malformed.
 * @throws {DecryptionFailedError} if the password is wrong or data was tampered
 *   with (Poly1305 authentication failure — these are indistinguishable, which
 *   is the correct security property).
 */
export function decryptFromVault(vault: EncryptedVault, password: string): string {
  const { salt, nonce, ciphertext, params } = parseVault(vault);
  const key = deriveKey(password, salt, params);

  try {
    const plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new DecryptionFailedError();
  } finally {
    wipe(key);
  }
}

function deriveKey(password: string, salt: Uint8Array, params: ScryptParams): Uint8Array {
  // NFKC normalize so visually-identical Unicode passwords derive the same key
  // across platforms/keyboards.
  const pw = utf8ToBytes(password.normalize('NFKC'));
  try {
    return scrypt(pw, salt, { N: params.N, r: params.r, p: params.p, dkLen: params.dkLen });
  } finally {
    wipe(pw);
  }
}

function parseVault(vault: EncryptedVault): {
  salt: Uint8Array;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  params: ScryptParams;
} {
  try {
    if (vault.version !== 1) throw new Error('unknown version');
    if (vault.kdf.algorithm !== 'scrypt') throw new Error('unknown kdf');
    if (vault.cipher !== 'xchacha20poly1305') throw new Error('unknown cipher');
    return {
      salt: base64.decode(vault.kdf.salt),
      nonce: base64.decode(vault.nonce),
      ciphertext: base64.decode(vault.ciphertext),
      params: { N: vault.kdf.N, r: vault.kdf.r, p: vault.kdf.p, dkLen: vault.kdf.dkLen },
    };
  } catch (err) {
    if (err instanceof VaultCorruptError) throw err;
    throw new VaultCorruptError();
  }
}
