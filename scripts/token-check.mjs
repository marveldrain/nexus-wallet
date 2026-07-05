const j = async (u, opt) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000); try { const r = await fetch(u, opt ? { ...opt, signal: c.signal } : { signal: c.signal }); return { status: r.status, acao: r.headers.get('access-control-allow-origin') ?? '(none)', body: await r.json() }; } finally { clearTimeout(t); } };

// EVM token discovery via Blockscout (vitalik holds many)
try {
  const r = await j('https://eth.blockscout.com/api/v2/addresses/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/token-balances');
  const erc20 = (r.body || []).filter(t => t.token?.type === 'ERC-20');
  console.log(`EVM tokens: HTTP ${r.status} CORS:${r.acao} total=${r.body.length} erc20=${erc20.length} sample=${erc20[0]?.token.symbol} ${erc20[0]?.value}`);
} catch (e) { console.log('EVM tokens ERR', e.message); }

// SPL token discovery via getTokenAccountsByOwner (a known token-holding owner)
try {
  const owner = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'; // Raydium authority (holds SPL)
  const r = await j('https://solana-rpc.publicnode.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [owner, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }] }) });
  const accts = r.body.result?.value ?? [];
  const first = accts[0]?.account?.data?.parsed?.info;
  console.log(`SPL tokens: HTTP ${r.status} CORS:${r.acao} count=${accts.length} sampleMint=${first?.mint?.slice(0,8)} amt=${first?.tokenAmount?.uiAmountString}`);
} catch (e) { console.log('SPL tokens ERR', e.message); }

// CoinGecko token price by contract (USDC on Ethereum)
try {
  const r = await j('https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&vs_currencies=usd&include_24hr_change=true');
  console.log(`Token price: HTTP ${r.status} CORS:${r.acao} ${JSON.stringify(r.body).slice(0,80)}`);
} catch (e) { console.log('Token price ERR', e.message); }
