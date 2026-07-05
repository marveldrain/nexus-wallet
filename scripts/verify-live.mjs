// Verifies the BUILT @nexus/chain-rpc clients against live mainnet endpoints,
// reading known funded addresses. Proves the production read path works.
import { BitcoinRpc, EvmRpc, SolanaRpc } from '../packages/chain-rpc/dist/index.js';

const ETH_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.drpc.org',
  'https://eth-mainnet.public.blastapi.io',
];
const BTC_APIS = ['https://blockstream.info/api', 'https://mempool.space/api'];
const SOL_RPCS = ['https://api.mainnet-beta.solana.com'];

// vitalik.eth — guaranteed non-zero.
const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
// Wrapped SOL mint account — a real, funded account.
const WSOL = 'So11111111111111111111111111111111111111112';

function eth(wei) {
  return (Number(wei) / 1e18).toFixed(4) + ' ETH';
}

const evm = new EvmRpc(ETH_RPCS, 1);
const btc = new BitcoinRpc(BTC_APIS);
const sol = new SolanaRpc(SOL_RPCS);

await Promise.all([
  (async () => {
    const bal = await evm.getBalance(VITALIK);
    const fees = await evm.getFees();
    console.log(`✅ ETH  vitalik.eth balance = ${eth(bal)}  | maxFeePerGas = ${(Number(fees.maxFeePerGas) / 1e9).toFixed(2)} gwei`);
  })().catch((e) => console.log(`❌ ETH  ${e.message}`)),

  (async () => {
    const rate = await btc.getFeeRate(6);
    const tipBal = await btc.getBalance('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
    console.log(`✅ BTC  fee rate = ${rate} sat/vB  | sample address balance = ${tipBal} sats`);
  })().catch((e) => console.log(`❌ BTC  ${e.message}`)),

  (async () => {
    const bal = await sol.getBalance(WSOL);
    const bh = await sol.getRecentBlockhash();
    console.log(`✅ SOL  wSOL mint balance = ${(Number(bal) / 1e9).toFixed(4)} SOL  | blockhash = ${bh.slice(0, 10)}…`);
  })().catch((e) => console.log(`❌ SOL  ${e.message}`)),
]);
