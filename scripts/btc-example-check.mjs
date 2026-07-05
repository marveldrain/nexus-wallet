import { BitcoinRpc } from '../packages/chain-rpc/dist/index.js';
const addr = 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97';
const rpc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);
const bal = await rpc.getBalance(addr);
console.log('balance sats:', bal.toString(), '=', Number(bal) / 1e8, 'BTC');
