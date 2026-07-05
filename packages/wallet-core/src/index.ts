/**
 * @nexus/wallet-core — platform-agnostic, non-custodial wallet engine.
 *
 * Pure TypeScript with zero platform dependencies, so the EXACT same audited
 * crypto runs on desktop (Tauri), mobile (React Native), and the browser
 * extension. No network, no storage, no UI — those live in the app layer.
 */

// Mnemonic / BIP39
export {
  generateMnemonic,
  isValidMnemonic,
  mnemonicToSeed,
  type MnemonicStrength,
} from './mnemonic';

// Keyring + chains
export { Keyring } from './keyring';
export { CHAIN_ADAPTERS, SUPPORTED_CHAINS } from './chains';
export type { ChainAdapter, ChainId, DerivedAccount } from './chains/types';

// Encrypted vault (persistence-facing)
export {
  createWallet,
  importMnemonic,
  unlockVault,
  revealMnemonic,
  type CreatedWallet,
  type CreateWalletOptions,
} from './vault';
export {
  DEFAULT_SCRYPT_PARAMS,
  encryptToVault,
  decryptFromVault,
  type EncryptedVault,
  type ScryptParams,
} from './crypto/encryption';

// Low-level utilities
export { secureRandomBytes, wipe } from './crypto/random';

// Errors
export * from './errors';
