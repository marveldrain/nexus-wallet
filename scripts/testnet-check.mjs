async function probeHttp(name, url, init) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { ...init, signal: c.signal, headers: { ...(init?.headers ?? {}), origin: 'http://localhost:5173' } });
    const acao = r.headers.get('access-control-allow-origin') ?? '(none)';
    const body = await r.text();
    console.log(`${name.padEnd(22)} HTTP ${r.status}  CORS:${acao.padEnd(4)}  ${body.slice(0, 90)}`);
  } catch (e) {
    console.log(`${name.padEnd(22)} FAIL  ${e.message}`);
  } finally {
    clearTimeout(t);
  }
}

async function probeRpc(name, url, method, params = []) {
  await probeHttp(name, url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}

console.log('--- Bitcoin testnet (Esplora) ---');
await probeHttp('blockstream testnet tip', 'https://blockstream.info/testnet/api/blocks/tip/height');
await probeHttp('mempool testnet tip', 'https://mempool.space/testnet/api/blocks/tip/height');
await probeHttp('blockstream testnet fees', 'https://blockstream.info/testnet/api/fee-estimates');

console.log('--- Ethereum Sepolia ---');
await probeRpc('publicnode sepolia', 'https://ethereum-sepolia-rpc.publicnode.com', 'eth_blockNumber');
await probeRpc('drpc sepolia', 'https://sepolia.drpc.org', 'eth_blockNumber');
await probeRpc('rpc.sepolia.org', 'https://rpc.sepolia.org', 'eth_blockNumber');
await probeHttp('blockscout sepolia tip', 'https://eth-sepolia.blockscout.com/api/v2/main-page/blocks');

console.log('--- Solana devnet ---');
await probeRpc('api.devnet.solana.com', 'https://api.devnet.solana.com', 'getHealth');
await probeRpc('publicnode sol devnet', 'https://solana-devnet-rpc.publicnode.com', 'getHealth');
