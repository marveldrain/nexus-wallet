const j = async (u, opt, to=20000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), to); try { const r = await fetch(u, opt ? { ...opt, signal: c.signal } : { signal: c.signal }); return { status: r.status, acao: r.headers.get('access-control-allow-origin') ?? '(none)', body: await r.json() }; } finally { clearTimeout(t); } };

// Blockscout token-balances for a moderate holder
try {
  const addr = '0x28C6c06298d514Db089934071355E5743bf21d60'; // Binance 14
  const r = await j(`https://eth.blockscout.com/api/v2/addresses/${addr}/token-balances`, null, 22000);
  const erc20 = (r.body || []).filter(t => t.token?.type === 'ERC-20');
  console.log(`EVM tokens: HTTP ${r.status} CORS:${r.acao} erc20=${erc20.length} sample=${erc20[0]?.token.symbol} dec=${erc20[0]?.token.decimals} val=${erc20[0]?.value}`);
} catch (e) { console.log('EVM tokens ERR', e.message); }

// getTokenAccountsByOwner across endpoints
const owner = 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMG'; // a known SPL holder
for (const url of ['https://solana.drpc.org', 'https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com']) {
  try {
    const r = await j(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [owner, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }] }) }, 12000);
    const accts = r.body.result?.value;
    console.log(`SPL ${url.padEnd(40)} HTTP ${r.status} CORS:${r.acao} ${accts ? 'count=' + accts.length : 'err=' + JSON.stringify(r.body.error).slice(0,40)}`);
  } catch (e) { console.log(`SPL ${url.padEnd(40)} ERR ${e.message}`); }
}
