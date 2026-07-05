import { CoinGeckoPriceSource } from '../packages/portfolio/dist/index.js';

const src = new CoinGeckoPriceSource();
const points = await src.getMarketChart('ethereum', 'usd', 1);
console.log(`ethereum 1d points: ${points.length}`);
console.log('first:', points[0]);
console.log('last:', points[points.length - 1]);
