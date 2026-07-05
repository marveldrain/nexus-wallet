const urls = [
  'https://solana-rpc.publicnode.com',
  'https://solana.drpc.org',
  'https://endpoints.omniatech.io/v1/sol/mainnet/public',
  'https://api.mainnet-beta.solana.com',
];
async function test(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 7000);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: ['So11111111111111111111111111111111111111112'] }), signal: c.signal });
    const acao = res.headers.get('access-control-allow-origin') ?? '(none)';
    const j = await res.json().catch(() => null);
    const val = j?.result?.value !== undefined ? '✅ ' + (j.result.value / 1e9).toFixed(1) + ' SOL' : '⚠️ ' + JSON.stringify(j).slice(0, 50);
    console.log(`${url.padEnd(52)} HTTP ${res.status}  CORS:${acao.padEnd(4)}  ${val}`);
  } catch (e) { console.log(`${url.padEnd(52)} ❌ ${e.message}`); }
  finally { clearTimeout(t); }
}
for (const u of urls) await test(u);
