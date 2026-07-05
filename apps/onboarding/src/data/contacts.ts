/**
 * Address book (saved recipients). Contacts are just labels + public addresses —
 * not sensitive — so they live in plain localStorage.
 */
import { isValidAddress } from './address';

/** An EVM address ('evm') works across all EVM networks. */
export type ContactChain = 'evm' | 'bitcoin' | 'solana';

export interface Contact {
  id: string;
  label: string;
  address: string;
  chain: ContactChain;
}

const STORAGE_KEY = 'nexus.contacts.v1';

export function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Contact[]) : [];
  } catch {
    return [];
  }
}

export function saveContacts(contacts: Contact[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

/** Detect which kind of address this is (or null if not valid on any chain). */
export function detectContactChain(address: string): ContactChain | null {
  const a = address.trim();
  if (isValidAddress('ethereum', a)) return 'evm';
  if (isValidAddress('bitcoin', a)) return 'bitcoin';
  if (isValidAddress('solana', a)) return 'solana';
  return null;
}

export function newContactId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const CONTACT_CHAIN_META: Record<ContactChain, { label: string; glyph: string; ring: string; bg: string }> = {
  evm: { label: 'EVM', glyph: 'Ξ', ring: 'text-indigo-300', bg: 'bg-indigo-400/10' },
  bitcoin: { label: 'Bitcoin', glyph: '₿', ring: 'text-amber-400', bg: 'bg-amber-400/10' },
  solana: { label: 'Solana', glyph: '◎', ring: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10' },
};
