// Verifies whatever RPC config you've placed in apps/onboarding/.env (or
// .env.local) actually connects — for EVERY chain Nexus supports, not just
// whichever one you remembered to test by hand. Run this after pasting in
// production (keyed) RPC URLs to confirm Hard Launch Gate #5 before going
// live with real funds:
//
//   npm run build --workspace=@nexus/chain-rpc   (if not already built)
//   node scripts/verify-rpc-config.mjs
//   node scripts/verify-rpc-config.mjs --sol-holder=<address-that-holds-SPL-tokens>
//
// Tests ONLY the first configured URL per chain in isolation (bypassing
// fallback) so a misconfigured keyed endpoint can't hide behind a working
// public one — the whole point of this script is to catch that.
import { existsSync, readFileSync } from 'node:fs';
import { BitcoinRpc, EvmRpc, SolanaRpc, getSolanaTokens } from '../packages/chain-rpc/dist/index.js';

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !m[1].startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = {
  ...loadEnvFile('apps/onboarding/.env'),
  ...loadEnvFile('apps/onboarding/.env.local'),
};
function firstUrl(key, fallback) {
  const raw = fileEnv[key] ?? process.env[key];
  const list = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : fallback;
  return list[0];
}
function isKeyed(url, publicUrl) {
  return url !== publicUrl;
}

const solHolderArg = process.argv.find((a) => a.startsWith('--sol-holder='));
const solHolder = solHolderArg?.slice('--sol-holder='.length);

const EVM_NETWORKS = [
  { name: 'Ethereum', chainId: 1, envKey: 'VITE_ETH_RPC_URLS', publicUrl: 'https://ethereum-rpc.publicnode.com' },
  { name: 'Ethereum Sepolia', chainId: 11_155_111, envKey: 'VITE_SEPOLIA_RPC_URLS', publicUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
  { name: 'Polygon', chainId: 137, envKey: 'VITE_POLYGON_RPC_URLS', publicUrl: 'https://polygon-bor-rpc.publicnode.com' },
  { name: 'BNB Chain', chainId: 56, envKey: 'VITE_BSC_RPC_URLS', publicUrl: 'https://bsc-rpc.publicnode.com' },
  { name: 'Arbitrum', chainId: 42_161, envKey: 'VITE_ARBITRUM_RPC_URLS', publicUrl: 'https://arbitrum-one-rpc.publicnode.com' },
  { name: 'Optimism', chainId: 10, envKey: 'VITE_OPTIMISM_RPC_URLS', publicUrl: 'https://optimism-rpc.publicnode.com' },
  { name: 'Base', chainId: 8453, envKey: 'VITE_BASE_RPC_URLS', publicUrl: 'https://base-rpc.publicnode.com' },
  { name: 'Avalanche', chainId: 43_114, envKey: 'VITE_AVALANCHE_RPC_URLS', publicUrl: 'https://avalanche-c-chain-rpc.publicnode.com' },
];

// vitalik.eth — a real, well-known address that's valid on every EVM chain.
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

let anyKeyed = false;
let failures = 0;

console.log('--- EVM ---');
for (const net of EVM_NETWORKS) {
  const resolvedUrl = firstUrl(net.envKey, [net.publicUrl]);
  const keyed = isKeyed(resolvedUrl, net.publicUrl);
  if (keyed) anyKeyed = true;
  try {
    const rpc = new EvmRpc([resolvedUrl], net.chainId);
    const balance = await rpc.getBalance(TEST_ADDRESS);
    console.log(`✅ ${net.name.padEnd(18)} ${keyed ? '[KEYED]' : '[public default]'} reachable (balance read returned ${balance} wei)`);
  } catch (err) {
    failures++;
    console.log(`❌ ${net.name.padEnd(18)} ${keyed ? '[KEYED]' : '[public default]'} FAILED: ${err.message}`);
  }
}

console.log('\n--- Bitcoin ---');
{
  const resolvedUrl = firstUrl('VITE_BTC_API_URLS', ['https://blockstream.info/api']);
  const keyed = isKeyed(resolvedUrl, 'https://blockstream.info/api') && isKeyed(resolvedUrl, 'https://mempool.space/api');
  if (keyed) anyKeyed = true;
  try {
    const rpc = new BitcoinRpc([resolvedUrl]);
    const rate = await rpc.getFeeRate(6);
    console.log(`✅ Bitcoin            ${keyed ? '[custom]' : '[public default]'} reachable (fee rate = ${rate} sat/vB)`);
  } catch (err) {
    failures++;
    console.log(`❌ Bitcoin            ${keyed ? '[custom]' : '[public default]'} FAILED: ${err.message}`);
  }
}

console.log('\n--- Solana ---');
{
  const resolvedUrl = firstUrl('VITE_SOL_RPC_URLS', ['https://solana-rpc.publicnode.com']);
  const keyed = isKeyed(resolvedUrl, 'https://solana-rpc.publicnode.com') && isKeyed(resolvedUrl, 'https://api.mainnet-beta.solana.com');
  if (keyed) anyKeyed = true;
  try {
    const rpc = new SolanaRpc([resolvedUrl]);
    const bh = await rpc.getRecentBlockhash();
    console.log(`✅ Solana             ${keyed ? '[KEYED]' : '[public default]'} reachable (blockhash = ${bh.slice(0, 10)}…)`);
  } catch (err) {
    failures++;
    console.log(`❌ Solana             ${keyed ? '[KEYED]' : '[public default]'} FAILED: ${err.message}`);
  }

  if (solHolder) {
    try {
      const tokens = await getSolanaTokens([resolvedUrl], solHolder);
      console.log(`✅ SPL token discovery via this endpoint: found ${tokens.length} token account(s) for ${solHolder}`);
    } catch (err) {
      failures++;
      console.log(`❌ SPL token discovery FAILED (this is the free-RPC 403 if you haven't set a keyed Solana RPC yet): ${err.message}`);
    }
  } else {
    console.log('ℹ️  Pass --sol-holder=<address> to also verify SPL token discovery against a real holder.');
  }
}

console.log(`\n${failures === 0 ? '✅ All configured endpoints reachable.' : `❌ ${failures} endpoint(s) failed — see above.`}`);
if (!anyKeyed) {
  console.log('⚠️  No keyed/custom RPC detected anywhere — you are still on public-only defaults. See docs/PRODUCTION_RPC.md before launch.');
}
process.exit(failures === 0 ? 0 : 1);
