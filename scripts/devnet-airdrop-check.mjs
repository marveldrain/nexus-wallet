const TEST_ADDR = '11111111111111111111111111111112'; // arbitrary valid-format pubkey for a dry probe
const r = await fetch('https://api.devnet.solana.com', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'requestAirdrop', params: [TEST_ADDR, 1000000000] }),
});
console.log(r.status, await r.text());
