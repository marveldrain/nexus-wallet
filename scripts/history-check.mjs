const j = async (u, opt) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000); try { const r = await fetch(u, { ...opt, signal: c.signal }); return { status: r.status, acao: r.headers.get('access-control-allow-origin') ?? '(none)', body: await r.json() }; } finally { clearTimeout(t); } };

// ETH history via Blockscout (free, no key)
try {
  const r = await j('https://eth.blockscout.com/api/v2/addresses/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/transactions');
  const n = r.body?.items?.length;
  console.log(`ETH Blockscout: HTTP ${r.status} CORS:${r.acao} items=${n} sample=${n ? r.body.items[0].hash.slice(0,14) + '… ' + r.body.items[0].value : ''}`);
} catch (e) { console.log('ETH Blockscout ERR', e.message); }

// BTC history via Esplora
try {
  const r = await j('https://blockstream.info/api/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa/txs');
  console.log(`BTC Esplora txs: HTTP ${r.status} CORS:${r.acao} count=${r.body.length} sample=${r.body[0]?.txid.slice(0,14)}…`);
} catch (e) { console.log('BTC Esplora ERR', e.message); }

// SOL history via getSignaturesForAddress
try {
  const r = await j('https://solana-rpc.publicnode.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: ['So11111111111111111111111111111111111111112', { limit: 3 }] }) });
  console.log(`SOL signatures: HTTP ${r.status} CORS:${r.acao} count=${r.body.result?.length} sample=${r.body.result?.[0]?.signature.slice(0,14)}…`);
} catch (e) { console.log('SOL ERR', e.message); }
