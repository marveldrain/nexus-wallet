/**
 * Price feed via CoinGecko's free Simple Price API.
 *
 * Maps our chain ids to CoinGecko asset ids. Swappable for any other source by
 * implementing `PriceSource`. All methods accept an optional fiat `currency`
 * (lowercase ISO 4217, e.g. "usd"/"eur"/"jpy"); `usd` on `PriceQuote` holds the
 * price in WHICHEVER currency was requested — the field name is kept for
 * backward compatibility, but it is not literally always US dollars.
 */

export interface PriceQuote {
  usd: number;
  change24hPct: number;
}

export interface PriceSource {
  getPrices(chainIds: string[]): Promise<Record<string, PriceQuote>>;
}

/** chain id → CoinGecko asset id. */
export const COINGECKO_IDS: Record<string, string> = {
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
};

/** Fiat currencies offered in the UI (lowercase, as CoinGecko expects). */
export const SUPPORTED_FIAT_CURRENCIES = ['usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'inr'] as const;
export type FiatCurrency = (typeof SUPPORTED_FIAT_CURRENCIES)[number];

interface CoinGeckoSimplePrice {
  [id: string]: Record<string, number>;
}

export class CoinGeckoPriceSource implements PriceSource {
  constructor(
    private readonly baseUrl = 'https://api.coingecko.com/api/v3',
    private readonly apiKey?: string,
  ) {}

  async getPrices(chainIds: string[], currency = 'usd'): Promise<Record<string, PriceQuote>> {
    const ids = chainIds.map((c) => COINGECKO_IDS[c] ?? c);
    const data = await this.simplePrice(ids, currency);

    const out: Record<string, PriceQuote> = {};
    for (const chain of chainIds) {
      const id = COINGECKO_IDS[chain] ?? chain;
      const quote = extractQuote(data[id], currency);
      if (quote) out[chain] = quote;
    }
    return out;
  }

  /**
   * Prices keyed directly by CoinGecko asset id (e.g. "ethereum",
   * "matic-network", "binancecoin"). Useful when several networks share a
   * native asset (ETH on Arbitrum/Optimism/Base all price as "ethereum").
   */
  async getPricesByIds(ids: string[], currency = 'usd'): Promise<Record<string, PriceQuote>> {
    if (ids.length === 0) return {};
    const data = await this.simplePrice(ids, currency);

    const out: Record<string, PriceQuote> = {};
    for (const [id, raw] of Object.entries(data)) {
      const quote = extractQuote(raw, currency);
      if (quote) out[id] = quote;
    }
    return out;
  }

  /**
   * Prices for tokens by contract address on a given platform
   * ("ethereum" | "solana" | …). Returns a map keyed by lowercased contract.
   */
  async getTokenPrices(
    platform: string,
    contracts: string[],
    currency = 'usd',
  ): Promise<Record<string, PriceQuote>> {
    if (contracts.length === 0) return {};
    const params = new URLSearchParams({
      contract_addresses: contracts.join(','),
      vs_currencies: currency,
      include_24hr_change: 'true',
    });
    if (this.apiKey) params.set('x_cg_demo_api_key', this.apiKey);

    const res = await fetch(`${this.baseUrl}/simple/token_price/${platform}?${params.toString()}`);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = (await res.json()) as CoinGeckoSimplePrice;

    const out: Record<string, PriceQuote> = {};
    for (const [contract, raw] of Object.entries(data)) {
      const quote = extractQuote(raw, currency);
      if (quote) out[contract.toLowerCase()] = quote;
    }
    return out;
  }

  /**
   * Historical price points `[unixMs, price][]` for one asset over the last
   * `days`. Used to chart portfolio value over time (price history × current
   * holdings — see @nexus/portfolio consumers for the weighting).
   */
  async getMarketChart(
    coingeckoId: string,
    currency = 'usd',
    days = 1,
  ): Promise<Array<[number, number]>> {
    const params = new URLSearchParams({ vs_currency: currency, days: String(days) });
    if (this.apiKey) params.set('x_cg_demo_api_key', this.apiKey);

    const res = await fetch(`${this.baseUrl}/coins/${coingeckoId}/market_chart?${params.toString()}`);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = (await res.json()) as { prices?: Array<[number, number]> };
    return data.prices ?? [];
  }

  private async simplePrice(ids: string[], currency: string): Promise<CoinGeckoSimplePrice> {
    const params = new URLSearchParams({
      ids: ids.join(','),
      vs_currencies: currency,
      include_24hr_change: 'true',
    });
    if (this.apiKey) params.set('x_cg_demo_api_key', this.apiKey);

    const res = await fetch(`${this.baseUrl}/simple/price?${params.toString()}`);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return (await res.json()) as CoinGeckoSimplePrice;
  }
}

function extractQuote(raw: Record<string, number> | undefined, currency: string): PriceQuote | null {
  if (!raw) return null;
  const price = raw[currency];
  if (price === undefined) return null;
  return { usd: price, change24hPct: raw[`${currency}_24h_change`] ?? 0 };
}
