/**
 * SNS (Solana Name Service) ".sol" name resolution via Bonfida's free, public,
 * CORS-enabled resolver proxy — avoids pulling in the full SNS SDK just to read
 * a name → owner mapping.
 */
const DEFAULT_PROXY_BASE = 'https://sns-sdk-proxy.bonfida.workers.dev';

interface ResolveResponse {
  s: 'ok' | 'error';
  result: string;
}

/** True if a string looks like an SNS name (e.g. "bonfida.sol" or "bonfida"). */
export function looksLikeSnsName(value: string): boolean {
  return /^[^\s]+\.sol$/i.test(value.trim());
}

/** Resolve a ".sol" name to its base58 owner address, or null if it doesn't resolve. */
export async function resolveSnsName(
  value: string,
  proxyBase: string = DEFAULT_PROXY_BASE,
): Promise<string | null> {
  const trimmed = value.trim();
  if (!looksLikeSnsName(trimmed)) return null;

  try {
    const res = await fetch(`${proxyBase}/resolve/${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as ResolveResponse;
    return data.s === 'ok' && typeof data.result === 'string' ? data.result : null;
  } catch {
    return null;
  }
}
