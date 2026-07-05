// Probes the public endpoints Nexus would use, to see what this environment can reach.
const withTimeout = (ms) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
};

async function probe(name, fn) {
  const started = Date.now();
  try {
    const out = await fn();
    console.log(`✅ ${name.padEnd(22)} ${Date.now() - started}ms  ${out}`);
  } catch (err) {
    console.log(`❌ ${name.padEnd(22)} ${Date.now() - started}ms  ${err.name}: ${err.message}`);
  }
}

async function getJson(url) {
  const t = withTimeout(7000);
  try {
    const res = await fetch(url, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.stringify(await res.json()).slice(0, 80);
  } finally {
    t.done();
  }
}

async function rpc(url, method) {
  const t = withTimeout(7000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
      signal: t.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.stringify(await res.json()).slice(0, 80);
  } finally {
    t.done();
  }
}

await Promise.all([
  probe('CoinGecko prices', () =>
    getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
  ),
  probe('Esplora BTC tip', () => getJson('https://blockstream.info/api/blocks/tip/height')),
  probe('ETH llamarpc', () => rpc('https://eth.llamarpc.com', 'eth_blockNumber')),
  probe('ETH cloudflare', () => rpc('https://cloudflare-eth.com', 'eth_blockNumber')),
  probe('Solana mainnet', () => rpc('https://api.mainnet-beta.solana.com', 'getHealth')),
]);
