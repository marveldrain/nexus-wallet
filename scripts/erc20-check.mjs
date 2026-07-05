import { getErc20TokenInfo } from '../packages/chain-rpc/dist/index.js';
const rpcs = ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'];
// USDC contract, owner = a known USDC holder (Coinbase)
const info = await getErc20TokenInfo(rpcs, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0x28C6c06298d514Db089934071355E5743bf21d60');
console.log('USDC info:', info ? `${info.symbol} (${info.name}) dec=${info.decimals} bal=${info.amount}` : 'null');
const bad = await getErc20TokenInfo(rpcs, '0x0000000000000000000000000000000000000001', '0x28C6c06298d514Db089934071355E5743bf21d60');
console.log('non-token =>', bad);
