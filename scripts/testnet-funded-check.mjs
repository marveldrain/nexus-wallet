import { BitcoinRpc, EvmRpc } from '../packages/chain-rpc/dist/index.js';

const btc = new BitcoinRpc(['https://blockstream.info/testnet/api', 'https://mempool.space/testnet/api']);
const eth = new EvmRpc(['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org'], 11155111);

// A few well-known, historically-active BTC testnet addresses (faucet/exchange related)
for (const addr of [
  'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // BIP173 testnet test vector
  '2N1LGaGg836mqSQqiuUBLfcyGBhyZbremDX', // well-known testnet faucet-adjacent
]) {
  try {
    const bal = await btc.getBalance(addr);
    console.log('BTC testnet', addr, '=', (Number(bal) / 1e8).toFixed(8), 'tBTC');
  } catch (e) { console.log('BTC testnet', addr, 'ERR', e.message); }
}

// vitalik.eth's address also exists on Sepolia (same EVM address space) - check its testnet ETH balance
try {
  const bal = await eth.getBalance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  console.log('Sepolia vitalik =', (Number(bal) / 1e18).toFixed(6), 'ETH');
} catch (e) { console.log('Sepolia ERR', e.message); }
