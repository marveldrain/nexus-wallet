/**
 * ENS name resolution (Ethereum mainnet).
 *
 * ENS lives on Ethereum mainnet, so resolution always uses a mainnet client
 * regardless of which chain a transfer will ultimately be sent on (the resolved
 * address is valid on every EVM network).
 */
import { createPublicClient, fallback, http, isAddress, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

/** True if a string looks like an ENS name (e.g. "vitalik.eth"). */
export function looksLikeEnsName(value: string): boolean {
  return /^[^\s]+\.eth$/i.test(value.trim());
}

/**
 * Resolve an ENS name to an address, or return null if it doesn't resolve.
 * If `value` is already a hex address, it's returned as-is.
 */
export async function resolveEnsName(rpcUrls: string[], value: string): Promise<Address | null> {
  const trimmed = value.trim();
  if (isAddress(trimmed)) return trimmed;
  if (!looksLikeEnsName(trimmed)) return null;

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: fallback(rpcUrls.map((url) => http(url))),
    });
    const address = await client.getEnsAddress({ name: normalize(trimmed) });
    return address ?? null;
  } catch {
    return null;
  }
}
