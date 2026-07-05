import { BitcoinRpc } from '../packages/chain-rpc/dist/index.js';
const rpc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);
for (const addr of ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa']) {
  const bal = await rpc.getBalance(addr);
  console.log(addr, '=', (Number(bal) / 1e8).toFixed(4), 'BTC');
}
