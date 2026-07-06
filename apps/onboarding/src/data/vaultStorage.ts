/**
 * Where the encrypted vault blob lives.
 *
 * The vault is ALWAYS scrypt+XChaCha20-Poly1305 encrypted under the user's
 * password before it gets anywhere near this module (see wallet-core) — this
 * module only decides where that opaque blob is persisted:
 *
 *  - Desktop (Electron shell, apps/desktop): the preload script exposes
 *    `window.nexusDesktop.vault`, backed by Electron `safeStorage` — the blob
 *    is ADDITIONALLY encrypted at rest with an OS-user-bound key (DPAPI on
 *    Windows, Keychain on macOS, libsecret on Linux) and written to the app's
 *    userData dir. Defense in depth: an attacker who copies the file from
 *    disk (other OS user, offline theft) can't even reach the
 *    password-encrypted blob to attempt offline brute force.
 *  - Web: plain localStorage (the blob is still password-encrypted).
 *
 * The bridge API is synchronous on purpose — the store decides its initial
 * step (welcome vs unlock) synchronously at creation; the preload implements
 * load via one sendSync IPC round-trip at startup, which is fine for a
 * single small read.
 */

export interface DesktopVaultBridge {
  /** Returns the vault JSON string, or null if none stored. */
  load(): string | null;
  save(json: string): void;
  clear(): void;
  /** False if the OS keystore is unavailable (rare; some Linux setups). */
  secure: boolean;
}

declare global {
  interface Window {
    nexusDesktop?: { vault: DesktopVaultBridge };
  }
}

const LOCAL_STORAGE_KEY = 'nexus.vault.v1';

function bridge(): DesktopVaultBridge | null {
  return typeof window !== 'undefined' ? (window.nexusDesktop?.vault ?? null) : null;
}

export function loadVaultJson(): string | null {
  const desktop = bridge();
  if (desktop) return desktop.load();
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveVaultJson(json: string): void {
  const desktop = bridge();
  if (desktop) {
    desktop.save(json);
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, json);
}

export function clearVaultJson(): void {
  const desktop = bridge();
  if (desktop) {
    desktop.clear();
    return;
  }
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

/** For display/diagnostics: where the vault is persisted right now. */
export function vaultStorageKind(): 'os-secure' | 'desktop-fallback' | 'browser' {
  const desktop = bridge();
  if (desktop) return desktop.secure ? 'os-secure' : 'desktop-fallback';
  return 'browser';
}
