import { getEvmTokens } from '../packages/chain-rpc/dist/index.js';
import { CoinGeckoPriceSource } from '../packages/portfolio/dist/index.js';

// EVM token discovery (Binance 14 — token-rich)
try {
  const tokens = await getEvmTokens('https://eth.blockscout.com', '0x28C6c06298d514Db089934071355E5743bf21d60');
  console.log(`getEvmTokens: ${tokens.length} ERC-20 (with balance>0)`);
  for (const t of tokens.slice(0, 4)) console.log(`   ${t.symbol.padEnd(8)} dec=${t.decimals} amount=${t.amount}`);
} catch (e) { console.log('getEvmTokens ERR', e.message); }

// Pricing by contract (lowercased, as the app passes them)
try {
  const map = await new CoinGeckoPriceSource().getTokenPrices('ethereum', [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  ]);
  console.log('getTokenPrices:');
  for (const [c, q] of Object.entries(map)) console.log(`   ${c.slice(0, 12)}… $${q.usd} (24h ${q.change24hPct?.toFixed(2)}%)`);
} catch (e) { console.log('getTokenPrices ERR', e.message); }
