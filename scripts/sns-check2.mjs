async function probe(name) {
  const r = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${name}`);
  console.log(name, '=>', r.status, await r.text());
}
await probe('bonfida.sol'); // with suffix, see if it still resolves
await probe('this-domain-definitely-does-not-exist-zzz999');
