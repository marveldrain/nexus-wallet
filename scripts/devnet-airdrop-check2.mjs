import { Keypair } from '../packages/wallet-core/node_modules/@solana/web3.js/lib/index.cjs.js';
const kp = Keypair.generate();
console.log('test pubkey:', kp.publicKey.toBase58());
const r = await fetch('https://api.devnet.solana.com', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [kp.publicKey.toBase58(), 100000000] }),
});
console.log(r.status, await r.text());
