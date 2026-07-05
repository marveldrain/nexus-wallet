const urls = [
  'https://ethereum-rpc.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://eth.drpc.org',
  'https://1rpc.io/eth',
  'https://eth-mainnet.public.blastapi.io',
  'https://eth.merkle.io',
];
async function test(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 7000);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }), signal: c.signal });
    const j = await res.json();
    console.log(`${res.ok && j.result ? '✅' : '⚠️ '} ${url.padEnd(42)} ${j.result ? 'block ' + parseInt(j.result, 16) : JSON.stringify(j).slice(0,60)}`);
  } catch (e) { console.log(`❌ ${url.padEnd(42)} ${e.message}`); }
  finally { clearTimeout(t); }
}
await Promise.all(urls.map(test));
