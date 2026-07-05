/**
 * Typed error hierarchy for @nexus/wallet-core.
 *
 * Every error carries a stable machine-readable `code` (for telemetry/handling)
 * and a human-friendly `message` safe to surface in the UI. We deliberately
 * never embed secret material (seeds, keys, passwords) in error messages.
 */

export type WalletErrorCode =
  | 'CRYPTO_UNAVAILABLE'
  | 'INVALID_MNEMONIC'
  | 'INVALID_PASSWORD'
  | 'KEYRING_LOCKED'
  | 'UNSUPPORTED_CHAIN'
  | 'VAULT_CORRUPT'
  | 'DECRYPTION_FAILED';

export class WalletError extends Error {
  readonly code: WalletErrorCode;

  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    // Restore prototype chain for transpiled targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CryptoUnavailableError extends WalletError {
  constructor(message = 'A secure cryptography provider is not available.') {
    super('CRYPTO_UNAVAILABLE', message);
    this.name = 'CryptoUnavailableError';
  }
}

export class InvalidMnemonicError extends WalletError {
  constructor(
    message = 'That recovery phrase is not valid. Check for typos, word order, and that every word is from the BIP39 list.',
  ) {
    super('INVALID_MNEMONIC', message);
    this.name = 'InvalidMnemonicError';
  }
}

export class InvalidPasswordError extends WalletError {
  constructor(message = 'Incorrect password.') {
    super('INVALID_PASSWORD', message);
    this.name = 'InvalidPasswordError';
  }
}

export class KeyringLockedError extends WalletError {
  constructor(message = 'The wallet is locked. Unlock it before deriving accounts or signing.') {
    super('KEYRING_LOCKED', message);
    this.name = 'KeyringLockedError';
  }
}

export class UnsupportedChainError extends WalletError {
  constructor(chain: string) {
    super('UNSUPPORTED_CHAIN', `Chain "${chain}" is not supported by this build.`);
    this.name = 'UnsupportedChainError';
  }
}

export class VaultCorruptError extends WalletError {
  constructor(message = 'The encrypted wallet data is malformed or unreadable.') {
    super('VAULT_CORRUPT', message);
    this.name = 'VaultCorruptError';
  }
}

export class DecryptionFailedError extends WalletError {
  constructor(
    message = 'Could not decrypt the wallet. The password is incorrect or the data was tampered with.',
  ) {
    super('DECRYPTION_FAILED', message);
    this.name = 'DecryptionFailedError';
  }
}
