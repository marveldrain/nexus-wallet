/**
 * Tiny resilient HTTP helper with multi-endpoint failover + timeout.
 *
 * Public RPCs are flaky and rate-limited, so every read tries each configured
 * endpoint in order until one succeeds. This is the resilience backbone for the
 * Bitcoin (Esplora) client; the EVM client gets the same behavior from viem's
 * `fallback` transport, and Solana from its own endpoint loop.
 */
import { RpcError } from './errors';

/**
 * Try each endpoint in order, treating BOTH a failed fetch/non-2xx status AND a
 * failure to `parse` the response body as reasons to fall through to the next
 * endpoint. The parse step matters: a flaky endpoint can return HTTP 200 with a
 * malformed body (a maintenance page, a truncated response, a misconfigured
 * proxy) — if parsing happened after this function returned, that failure mode
 * would bypass failover entirely.
 */
async function tryFetch<T>(
  baseUrls: string[],
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  parse: (res: Response) => Promise<T>,
): Promise<T> {
  if (baseUrls.length === 0) throw new RpcError('No RPC endpoints configured.');
  let lastError: unknown;

  for (const base of baseUrls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
      if (!res.ok) throw new RpcError(`HTTP ${res.status} from ${base}${path}`);
      return await parse(res);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new RpcError(`All endpoints failed for ${path}: ${describe(lastError)}`);
}

export async function fetchJson<T>(
  baseUrls: string[],
  path: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<T> {
  return tryFetch<T>(baseUrls, path, init, timeoutMs, (res) => res.json() as Promise<T>);
}

export async function fetchText(
  baseUrls: string[],
  path: string,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<string> {
  return tryFetch<string>(baseUrls, path, init, timeoutMs, async (res) => (await res.text()).trim());
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
