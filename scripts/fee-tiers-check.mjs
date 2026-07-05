import { BitcoinRpc, EvmRpc } from '../packages/chain-rpc/dist/index.js';

const evm = new EvmRpc(['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'], 1);
const btc = new BitcoinRpc(['https://blockstream.info/api', 'https://mempool.space/api']);

const evmTiers = await evm.getFeeTiers();
console.log('EVM fee tiers (maxFeePerGas / maxPriorityFeePerGas, gwei):');
for (const [id, t] of Object.entries(evmTiers)) {
  console.log(`  ${id.padEnd(4)} max=${(Number(t.maxFeePerGas) / 1e9).toFixed(3)} priority=${(Number(t.maxPriorityFeePerGas) / 1e9).toFixed(3)}`);
}

const btcTiers = await btc.getFeeTiers();
console.log('BTC fee tiers (sat/vB):', btcTiers);
