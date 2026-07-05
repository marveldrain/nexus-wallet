import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BitcoinRpc,
  fetchJson,
  getBitcoinHistory,
  getEthereumHistory,
  getEvmTokens,
  getSolanaTokens,
  RpcError,
} from '../index';

/** Build a fake fetch Response. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchJson failover', () => {
  it('falls back to the next endpoint when the first fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse({ ok: 'second' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJson<{ ok: string }>(
      ['https://bad.example', 'https://good.example'],
      '/ping',
    );

    expect(result.ok).toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws RpcError when every endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(fetchJson(['https://a.example', 'https://b.example'], '/x')).rejects.toThrow(
      RpcError,
    );
  });

  it('treats a non-2xx response as a failure and fails over', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchJson(['https://a.example', 'https://b.example'], '/x'),
    ).resolves.toEqual({ ok: true });
  });

  it('falls over when an endpoint returns HTTP 200 with a malformed JSON body', async () => {
    // Real-world scenario: a maintenance page, a misconfigured CORS proxy, or a
    // truncated response served with a 200 status. The HTTP-level check alone
    // can't catch this — only attempting to parse the body reveals the failure,
    // so the parse step must ALSO be inside the per-endpoint try/retry, not after it.
    const brokenRes = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      },
      text: async () => '<html>503 Service Unavailable</html>',
    } as Response;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(brokenRes)
      .mockResolvedValueOnce(jsonResponse({ ok: 'second' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJson<{ ok: string }>(
      ['https://flaky.example', 'https://good.example'],
      '/ping',
    );
    expect(result.ok).toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws immediately with no endpoints configured', async () => {
    await expect(fetchJson([], '/x')).rejects.toThrow(RpcError);
  });

  it('recovers from a mix of network error, HTTP error, and malformed body before a good endpoint', async () => {
    const malformed = {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
      text: async () => 'not json',
    } as Response;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({}, false, 502))
      .mockResolvedValueOnce(malformed)
      .mockResolvedValueOnce(jsonResponse({ ok: 'fourth' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJson<{ ok: string }>(
      ['https://a.example', 'https://b.example', 'https://c.example', 'https://d.example'],
      '/x',
    );
    expect(result.ok).toBe('fourth');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('BitcoinRpc', () => {
  it('sums confirmed UTXOs into a balance (and ignores unconfirmed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse([
          { txid: 'a'.repeat(64), vout: 0, value: 150_000, status: { confirmed: true } },
          { txid: 'b'.repeat(64), vout: 1, value: 50_000, status: { confirmed: true } },
          { txid: 'c'.repeat(64), vout: 0, value: 999, status: { confirmed: false } },
        ]),
      ),
    );

    const rpc = new BitcoinRpc(['https://esplora.example']);
    expect(await rpc.getBalance('bc1qexample')).toBe(200_000n);

    const utxos = await rpc.getUtxos('bc1qexample');
    expect(utxos).toHaveLength(2);
    expect(utxos[0]!.value).toBe(150_000n);
  });

  it('picks the requested fee target', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ '1': 42.3, '6': 12.1, '144': 2 })),
    );
    const rpc = new BitcoinRpc(['https://esplora.example']);
    expect(await rpc.getFeeRate(6)).toBe(12.1);
  });
});

describe('transaction history normalization', () => {
  it('computes BTC direction & net amount (received − spent)', async () => {
    const me = 'bc1qme';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse([
          // Incoming: 0.5 BTC to me, no inputs from me
          {
            txid: 'aa'.repeat(32),
            status: { confirmed: true, block_time: 1_700_000_000 },
            vin: [{ prevout: { scriptpubkey_address: 'bc1qother', value: 60_000_000 } }],
            vout: [{ scriptpubkey_address: me, value: 50_000_000 }],
          },
          // Outgoing: spent 1.0, got 0.4 change back → net −0.6
          {
            txid: 'bb'.repeat(32),
            status: { confirmed: false },
            vin: [{ prevout: { scriptpubkey_address: me, value: 100_000_000 } }],
            vout: [{ scriptpubkey_address: me, value: 40_000_000 }],
          },
        ]),
      ),
    );

    const [incoming, outgoing] = await getBitcoinHistory(['https://esplora.example'], me);
    expect(incoming!.direction).toBe('in');
    expect(incoming!.amount).toBe(50_000_000n);
    expect(incoming!.status).toBe('confirmed');
    expect(outgoing!.direction).toBe('out');
    expect(outgoing!.amount).toBe(60_000_000n);
    expect(outgoing!.status).toBe('pending');
  });

  it('derives ETH direction from from/to and reads failed status', async () => {
    const me = '0xABCdef0000000000000000000000000000000001';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            { hash: '0x1', value: '1000000000000000000', timestamp: '2024-01-01T00:00:00Z', status: 'ok', from: { hash: '0xother' }, to: { hash: me.toLowerCase() } },
            { hash: '0x2', value: '0', timestamp: '2024-01-02T00:00:00Z', status: 'error', from: { hash: me.toLowerCase() }, to: { hash: '0xother' } },
          ],
        }),
      ),
    );

    const [recv, sent] = await getEthereumHistory('https://blockscout.example', me);
    expect(recv!.direction).toBe('in');
    expect(recv!.amount).toBe(1_000_000_000_000_000_000n);
    expect(sent!.direction).toBe('out');
    expect(sent!.status).toBe('failed');
  });
});

describe('token discovery', () => {
  it('parses ERC-20 balances and filters non-tokens / zero / addressless', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse([
          { token: { address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48', symbol: 'USDC', name: 'USD Coin', decimals: '6', type: 'ERC-20' }, value: '2500000' },
          { token: { address: '0xZero', symbol: 'ZERO', name: 'Zero', decimals: '18', type: 'ERC-20' }, value: '0' }, // filtered: zero
          { token: { address: '0xNft', symbol: 'PUNK', name: 'Punk', decimals: null, type: 'ERC-721' }, value: '1' }, // filtered: not ERC-20
          { token: { address: null, symbol: 'BAD', name: 'Bad', decimals: '18', type: 'ERC-20' }, value: '5' }, // filtered: no address
        ]),
      ),
    );

    const tokens = await getEvmTokens('https://blockscout.example', '0xme');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ symbol: 'USDC', decimals: 6, amount: 2_500_000n });
    expect(tokens[0]!.contract).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'); // lowercased
  });

  it('parses SPL token accounts and resolves known mints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          result: {
            value: [
              { account: { data: { parsed: { info: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', tokenAmount: { amount: '1500000', decimals: 6 } } } } } },
              { account: { data: { parsed: { info: { mint: 'SomeOtherMint1111111111111111111111111111111', tokenAmount: { amount: '0', decimals: 9 } } } } } }, // filtered: zero
            ],
          },
        }),
      ),
    );

    const tokens = await getSolanaTokens(['https://sol.example'], 'ownerPubkey');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ symbol: 'USDC', decimals: 6, amount: 1_500_000n });
  });
});
