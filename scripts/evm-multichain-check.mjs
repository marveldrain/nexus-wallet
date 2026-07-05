const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const chains = [
  ['Ethereum', 'https://ethereum-rpc.publicnode.com'],
  ['Polygon', 'https://polygon-bor-rpc.publicnode.com'],
  ['BNB Chain', 'https://bsc-rpc.publicnode.com'],
  ['Arbitrum', 'https://arbitrum-one-rpc.publicnode.com'],
  ['Optimism', 'https://optimism-rpc.publicnode.com'],
  ['Base', 'https://base-rpc.publicnode.com'],
  ['Avalanche', 'https://avalanche-c-chain-rpc.publicnode.com'],
];
async function test([name, url]) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [VITALIK, 'latest'] }),
      signal: c.signal,
    });
    const acao = r.headers.get('access-control-allow-origin') ?? '(none)';
    const j = await r.json();
    const bal = j.result ? (parseInt(j.result, 16) / 1e18).toFixed(4) : 'err:' + JSON.stringify(j).slice(0, 30);
    console.log(`${name.padEnd(11)} HTTP ${r.status} CORS:${acao.padEnd(3)} bal=${bal}`);
  } catch (e) {
    console.log(`${name.padEnd(11)} FAIL ${e.message}`);
  } finally {
    clearTimeout(t);
  }
}
for (const c of chains) await test(c);
