import { BitcoinRpc } from '../packages/chain-rpc/dist/index.js';
const rpc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);
const candidates = ['12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX'];
for (const addr of candidates) {
  try {
    const bal = await rpc.getBalance(addr);
    console.log(addr, '=', (Number(bal) / 1e8).toFixed(8), 'BTC');
  } catch (e) { console.log(addr, 'ERR', e.message); }
}
