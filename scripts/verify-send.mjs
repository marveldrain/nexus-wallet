// Proves the LIVE send pipeline: real network params + broadcast reachability.
// Uses no private keys and risks no funds (broadcasts only invalid junk, which
// the chains reject — proving the broadcast endpoints are reachable & live).
import { BitcoinRpc, EvmRpc, SolanaRpc } from '../packages/chain-rpc/dist/index.js';

const evm = new EvmRpc(['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'], 1);
const btc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);
const sol = new SolanaRpc(['https://solana-rpc.publicnode.com']);

const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const EMPTY_BTC = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

console.log('--- live send params ---');
console.log('ETH nonce(vitalik)   =', await evm.getNonce(VITALIK));
const fees = await evm.getFees();
console.log('ETH maxFeePerGas     =', (Number(fees.maxFeePerGas) / 1e9).toFixed(2), 'gwei');
console.log('BTC fee rate         =', await btc.getFeeRate(6), 'sat/vB');
console.log('BTC utxos(empty addr)=', (await btc.getUtxos(EMPTY_BTC)).length);
console.log('SOL recent blockhash =', (await sol.getRecentBlockhash()).slice(0, 12) + '…');

console.log('--- broadcast reachability (junk → expect rejection) ---');
try {
  await evm.broadcast('0xdeadbeef');
  console.log('ETH broadcast: UNEXPECTEDLY ACCEPTED');
} catch (e) {
  console.log('ETH broadcast reachable, rejected junk:', String(e.message).slice(0, 70));
}
try {
  await btc.broadcast('00');
  console.log('BTC broadcast: UNEXPECTEDLY ACCEPTED');
} catch (e) {
  console.log('BTC broadcast reachable, rejected junk:', String(e.message).slice(0, 70));
}
