/**
 * Cryptographically secure randomness + memory hygiene helpers.
 *
 * SECURITY: We ONLY use the platform CSPRNG (Web Crypto `getRandomValues`,
 * which is backed by the OS entropy pool on every supported platform:
 * Node, browsers, React Native via a polyfill, Tauri webview). We NEVER
 * fall back to `Math.random()` — a non-CSPRNG would catastrophically weaken
 * key generation.
 */
import { CryptoUnavailableError } from '../errors';

// Web Crypto caps a single getRandomValues() call at 65,536 bytes.
const MAX_BYTES_PER_CALL = 65_536;

/**
 * Returns `length` cryptographically secure random bytes.
 * @throws {CryptoUnavailableError} if no platform CSPRNG is present.
 */
export function secureRandomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError('secureRandomBytes: length must be a non-negative integer');
  }
  const webcrypto = globalThis.crypto;
  if (!webcrypto || typeof webcrypto.getRandomValues !== 'function') {
    throw new CryptoUnavailableError(
      'No secure random number generator is available in this environment.',
    );
  }

  const out = new Uint8Array(length);
  for (let offset = 0; offset < length; offset += MAX_BYTES_PER_CALL) {
    const end = Math.min(offset + MAX_BYTES_PER_CALL, length);
    webcrypto.getRandomValues(out.subarray(offset, end));
  }
  return out;
}

/**
 * Best-effort zeroization of sensitive buffers.
 *
 * NOTE: JavaScript gives us no guarantee the runtime/GC hasn't already copied
 * these bytes elsewhere. This reduces the window of exposure but is not a
 * substitute for keeping secrets in a native secure enclave (mobile Keychain/
 * Keystore, Tauri Rust side). Always call this on private keys/seeds once a
 * signing operation completes.
 */
export function wipe(...buffers: Array<Uint8Array | null | undefined>): void {
  for (const buf of buffers) {
    if (buf) buf.fill(0);
  }
}
