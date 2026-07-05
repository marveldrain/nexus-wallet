import { BitcoinRpc } from '../packages/chain-rpc/dist/index.js';
const rpc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);
// A handful of real, modestly-funded, well-known bech32 addresses (faucets/test wallets)
const candidates = [
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', // BIP173 test vector address
];
for (const addr of candidates) {
  try {
    const bal = await rpc.getBalance(addr);
    console.log(addr, '=', (Number(bal) / 1e8).toFixed(8), 'BTC');
  } catch (e) { console.log(addr, 'ERR', e.message); }
}
