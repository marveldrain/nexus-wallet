/** User display preferences — not sensitive, plain localStorage. */
import { SUPPORTED_FIAT_CURRENCIES, type FiatCurrency } from '@nexus/portfolio';

const STORAGE_KEY = 'nexus.fiatcurrency.v1';

export { SUPPORTED_FIAT_CURRENCIES, type FiatCurrency };

export const CURRENCY_SYMBOLS: Record<FiatCurrency, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  cad: 'CA$',
  aud: 'A$',
  inr: '₹',
};

export function loadFiatCurrency(): FiatCurrency {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && (SUPPORTED_FIAT_CURRENCIES as readonly string[]).includes(raw) ? (raw as FiatCurrency) : 'usd';
  } catch {
    return 'usd';
  }
}

export function saveFiatCurrency(currency: FiatCurrency): void {
  localStorage.setItem(STORAGE_KEY, currency);
}

// --- Security preferences ----------------------------------------------------

const AUTO_LOCK_KEY = 'nexus.autolockminutes.v1';
const LOCK_ON_BLUR_KEY = 'nexus.lockonblur.v1';
const WIPE_AFTER_ATTEMPTS_KEY = 'nexus.wipeafterattempts.v1';

/** Idle auto-lock options in minutes. 0 = never. */
export const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 0] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_OPTIONS)[number];

const DEFAULT_AUTO_LOCK_MINUTES: AutoLockMinutes = 5;

export function loadAutoLockMinutes(): AutoLockMinutes {
  try {
    const raw = Number(localStorage.getItem(AUTO_LOCK_KEY));
    return (AUTO_LOCK_OPTIONS as readonly number[]).includes(raw)
      ? (raw as AutoLockMinutes)
      : DEFAULT_AUTO_LOCK_MINUTES;
  } catch {
    return DEFAULT_AUTO_LOCK_MINUTES;
  }
}

export function saveAutoLockMinutes(minutes: AutoLockMinutes): void {
  localStorage.setItem(AUTO_LOCK_KEY, String(minutes));
}

/** Lock immediately when the tab/window loses focus or is hidden. Off by default. */
export function loadLockOnBlur(): boolean {
  try {
    return localStorage.getItem(LOCK_ON_BLUR_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLockOnBlur(enabled: boolean): void {
  localStorage.setItem(LOCK_ON_BLUR_KEY, String(enabled));
}

/**
 * Wipe the local vault after N consecutive failed unlock attempts. `null` =
 * disabled (default) — this is a destructive, opt-in protection against
 * someone brute-forcing an unlocked device; users must have their recovery
 * phrase backed up elsewhere before enabling it.
 */
export const WIPE_AFTER_ATTEMPTS_OPTIONS = [null, 5, 10, 20] as const;
export type WipeAfterAttempts = (typeof WIPE_AFTER_ATTEMPTS_OPTIONS)[number];

export function loadWipeAfterAttempts(): WipeAfterAttempts {
  try {
    const raw = localStorage.getItem(WIPE_AFTER_ATTEMPTS_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return (WIPE_AFTER_ATTEMPTS_OPTIONS as readonly (number | null)[]).includes(n) ? (n as WipeAfterAttempts) : null;
  } catch {
    return null;
  }
}

export function saveWipeAfterAttempts(value: WipeAfterAttempts): void {
  if (value === null) localStorage.removeItem(WIPE_AFTER_ATTEMPTS_KEY);
  else localStorage.setItem(WIPE_AFTER_ATTEMPTS_KEY, String(value));
}

// --- Network mode (mainnet / testnet) ----------------------------------------

const NETWORK_MODE_KEY = 'nexus.networkmode.v1';
export type NetworkMode = 'mainnet' | 'testnet';

/**
 * Testnet mode swaps Bitcoin/Ethereum/Solana to free, real test networks
 * (Bitcoin testnet3, Ethereum Sepolia, Solana devnet) for safe funded QA —
 * see docs/SENDING.md. Defaults to mainnet.
 */
export function loadNetworkMode(): NetworkMode {
  try {
    return localStorage.getItem(NETWORK_MODE_KEY) === 'testnet' ? 'testnet' : 'mainnet';
  } catch {
    return 'mainnet';
  }
}

export function saveNetworkMode(mode: NetworkMode): void {
  localStorage.setItem(NETWORK_MODE_KEY, mode);
}
