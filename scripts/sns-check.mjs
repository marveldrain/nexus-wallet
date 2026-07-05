async function probe(url) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { origin: 'http://localhost:5173' } });
    const acao = r.headers.get('access-control-allow-origin') ?? '(none)';
    const body = await r.text();
    console.log(`${url}\n  HTTP ${r.status} CORS:${acao}\n  ${body.slice(0, 200)}`);
  } catch (e) { console.log(`${url}\n  ERR ${e.message}`); }
}
// Bonfida's public SNS resolver API (used by their own web app)
await probe('https://sns-sdk-proxy.bonfida.workers.dev/resolve/bonfida');
await probe('https://sns-api.bonfida.com/v2/name/bonfida');
