import { CoinGeckoPriceSource } from '../packages/portfolio/dist/index.js';

const src = new CoinGeckoPriceSource();
for (const currency of ['usd', 'eur', 'jpy']) {
  const prices = await src.getPrices(['bitcoin', 'ethereum'], currency);
  console.log(currency.toUpperCase(), JSON.stringify(prices));
}
