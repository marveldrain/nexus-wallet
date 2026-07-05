/**
 * Multi-account support. An "account" is an HD derivation index — the SAME
 * index is used across every chain (BTC/ETH/SOL), matching how most wallets
 * (MetaMask, Phantom, etc.) model "accounts". Only the index + a display name
 * are persisted; addresses are re-derived from the seed on each unlock.
 */
const STORAGE_KEY = 'nexus.accountnames.v1';

export interface WalletAccountMeta {
  index: number;
  name: string;
}

function loadNames(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function saveNames(names: Record<number, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

/** All known accounts (always includes index 0), sorted by index. */
export function loadAccountList(): WalletAccountMeta[] {
  const names = loadNames();
  const indices = new Set([0, ...Object.keys(names).map(Number)]);
  return [...indices]
    .sort((a, b) => a - b)
    .map((index) => ({ index, name: names[index] ?? defaultName(index) }));
}

export function defaultName(index: number): string {
  return `Account ${index + 1}`;
}

export function renameAccount(index: number, name: string): void {
  const names = loadNames();
  names[index] = name.trim() || defaultName(index);
  saveNames(names);
}

/** Next unused account index. */
export function nextAccountIndex(): number {
  const list = loadAccountList();
  return Math.max(...list.map((a) => a.index)) + 1;
}

export function addAccount(name?: string): WalletAccountMeta {
  const index = nextAccountIndex();
  const names = loadNames();
  names[index] = name?.trim() || defaultName(index);
  saveNames(names);
  return { index, name: names[index] };
}
