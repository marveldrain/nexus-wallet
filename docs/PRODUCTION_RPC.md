# Production RPC setup (Hard Launch Gate #5)

Nexus reads balances/fees and broadcasts transactions over public RPC
endpoints by default (publicnode.com, Blockstream, mempool.space,
api.mainnet-beta.solana.com). That's fine for development, but **not reliable
enough for production**: free endpoints have no SLA, can silently rate-limit
or go down, and Solana's free RPCs outright reject SPL token discovery with
an HTTP 403. This is one of the non-negotiable [Hard Launch Gates](LAUNCH_CHECKLIST.md).

The good news: the app already has a generic, tested failover mechanism —
every RPC config is just a comma-separated list of URLs tried in order
(`packages/chain-rpc/src/http.ts`'s `tryFetch`, viem's `fallback()` transport
for EVM, and chain-rpc's `SolanaRpc.tryEach`). **Closing this gate is
entirely a config change, not a code change**: put a paid/keyed URL first in
each list, leave the public URLs after it as fallback.

## Steps

1. **Sign up with a provider** (see table below).
2. **Copy `apps/onboarding/.env.example` → `apps/onboarding/.env`** and
   uncomment/edit the `VITE_*_RPC_URLS` lines for the provider you chose,
   putting your keyed URL first and a public URL after it.
3. **Build chain-rpc** if you haven't: `npm run build --workspace=@nexus/chain-rpc`
   (or `cd packages/chain-rpc && npm run build`).
4. **Verify it actually works**: `node scripts/verify-rpc-config.mjs`. This
   tests every chain's *first* configured URL in isolation — so a broken
   keyed endpoint can't hide behind a working public fallback — and tells you
   plainly whether it detected a keyed override or you're still on defaults.
   Add `--sol-holder=<some-address-that-holds-SPL-tokens>` to also confirm
   SPL discovery is actually unblocked, not just that the RPC answers.
5. Restart the dev server / rebuild the app so Vite picks up the new `.env`.

## Verified URL formats (checked against current docs, June 2026)

### EVM (Alchemy)
Sign up: https://dashboard.alchemy.com — pattern `https://<subdomain>.g.alchemy.com/v2/<KEY>`

| Network | Subdomain |
|---|---|
| Ethereum mainnet | `eth-mainnet` |
| Ethereum Sepolia | `eth-sepolia` |
| Polygon | `polygon-mainnet` |
| BNB Chain | `bnb-mainnet` |
| Arbitrum | `arb-mainnet` |
| Optimism | `opt-mainnet` |
| Base | `base-mainnet` |
| Avalanche | `avax-mainnet` |

### EVM (Infura)
Sign up: https://www.infura.io — pattern `https://<subdomain>.infura.io/v3/<KEY>`

| Network | Subdomain |
|---|---|
| Ethereum mainnet | `mainnet` |
| Ethereum Sepolia | `sepolia` |
| Polygon | `polygon-mainnet` |
| BNB Chain | `bsc-mainnet` |
| Arbitrum | `arbitrum-mainnet` |
| Optimism | `optimism-mainnet` |
| Base | `base-mainnet` |
| Avalanche | `avalanche-mainnet` |

Pick ONE provider (Alchemy or Infura) — no need for both. Either is a fine
production choice; the app doesn't care which, since it just sees a URL.

### Solana (Helius — recommended)
Sign up: https://dashboard.helius.dev — pattern:
- Mainnet: `https://mainnet.helius-rpc.com/?api-key=<KEY>`
- Devnet: `https://devnet.helius-rpc.com/?api-key=<KEY>`

Helius is specifically recommended (not just "a" option) because it's also
what closes the existing **SPL token discovery** gap in
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) Phase 1 — free Solana RPCs
(`publicnode.com`, `api.mainnet-beta.solana.com`) reject the
`getTokenAccountsByOwner` call our token discovery needs with an HTTP 403.
`packages/chain-rpc/src/tokens.ts`'s `getSolanaTokens()` already accepts any
RPC URL list — pointing `VITE_SOL_RPC_URLS` at Helius is the entire fix, no
code change needed.

### Bitcoin
Our client (`packages/chain-rpc/src/bitcoin.ts`) speaks the **Esplora REST
API** specifically (`/address/{a}/utxo`, `/fee-estimates`, `POST /tx`) — not
raw Bitcoin Core JSON-RPC, so generic "Bitcoin node" providers (QuickNode,
GetBlock, etc.) won't plug in directly unless they expose an Esplora-
compatible REST interface. Two paths, both already Esplora-compatible so
neither needs a code change, just a URL:
- **Blockstream's Esplora API** now offers a paid tier with a 99.9% SLA.
- **mempool.space** offers Enterprise sponsorship for higher rate limits.

Contact either directly for pricing; once you have a URL, put it first in
`VITE_BTC_API_URLS`, same pattern as everything else in this doc.

## What this does NOT close

Pasting in real keys gets you reliable, rate-limit-resistant infrastructure
for the RPC layer specifically. It does not substitute for:
- A production CoinGecko plan (separate concern — `VITE_COINGECKO_KEY`,
  already wired, see the demo-tier note in `.env.example`).
- Monitoring/alerting if a keyed provider itself goes down (Phase 5 —
  uptime/status monitoring is still an open checklist item).
- Cost: keyed RPC plans are usage-billed. Budget for this before launch and
  watch usage during the first weeks live.
