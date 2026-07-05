/** User-added custom ERC-20 tokens — just contract addresses (Ethereum). */
const STORAGE_KEY = 'nexus.customtokens.v1';

export function loadCustomTokens(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTokens(contracts: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function addCustomTokenContract(contract: string): string[] {
  const normalized = contract.trim().toLowerCase();
  const list = loadCustomTokens();
  if (!list.includes(normalized)) list.push(normalized);
  saveCustomTokens(list);
  return list;
}

export function removeCustomTokenContract(contract: string): string[] {
  const list = loadCustomTokens().filter((c) => c !== contract.trim().toLowerCase());
  saveCustomTokens(list);
  return list;
}
