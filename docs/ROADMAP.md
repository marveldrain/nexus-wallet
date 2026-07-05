# Nexus Wallet — Roadmap to launch

Status legend: ✅ done & verified · 🟡 partial/mocked · ⬜ not started

## Where we are
The full create → hold → value → send/receive loop works, the core crypto is
audited-library-only and unit-tested (33 tests), and **balances + prices are now
live** against public mainnet RPCs (verified in-browser). Signing is real on all
three chains; transaction *broadcast* is the main remaining mock.

## Milestone 1 — Operational core (almost done)
- [x] Wallet create / import / unlock (BIP39, encrypted vault)
- [x] HD derivation BTC / ETH(+EVM) / SOL
- [x] Live balances + prices in the dashboard (chain-rpc + CoinGecko)
- [x] Receive (QR) + Send UI with **real signing**
- [x] **Live send end-to-end** — real nonce/gas/fees/UTXOs/blockhash from
      `chain-rpc`, real signing, real `broadcast()`. Live fees show in the form;
      broadcast endpoints verified reachable. *(Empty wallet correctly can't
      complete a send; next: testnet mode + funded QA before mainnet sends.)*
- [ ] ⬜ Testnet mode (VITE_NETWORK=testnet) for safe funded send QA
- [ ] ⬜ Real portfolio value chart (CoinGecko market_chart weighted by holdings)
- [x] **Transaction history** — normalized per chain (Esplora / Blockscout /
      getSignaturesForAddress), Activity screen with direction, amount, time,
      status, explorer links. Verified live in-browser. *(SOL amounts pending a
      getTransaction follow-up.)*

## Milestone 2 — Customer-ready UX & safety
- [ ] ⬜ Auto-lock on idle / backgrounding + manual lock (lock exists)
- [ ] ⬜ Settings: change password, reveal seed (re-auth), manage RPC endpoints
- [ ] ⬜ BIP39 passphrase ("25th word") toggle in UI (supported in core)
- [ ] ⬜ Multi-account / multiple addresses per chain (core supports any index)
- [ ] ⬜ Address book + labels; address QR scanner
- [ ] ⬜ Anti-phishing: per-user unlock image, domain warnings
- [ ] ⬜ Empty/loading/error states audit across all screens
- [ ] ⬜ Light mode + mobile-width QA

## Milestone 3 — Distribution (pick first target)
- [ ] ⬜ **Browser extension (MV3)** — background keyring + EIP-1193 provider (dApps)
- [ ] ⬜ **Desktop (Tauri)** — package the app, OS-secure storage for the vault
- [ ] ⬜ **Mobile (React Native)** — Keychain/Keystore + biometrics
- [ ] ⬜ Replace `localStorage` vault with OS-secure storage per platform

## Milestone 4 — Growth features
- [x] **EVM multichain** — one address valued across Ethereum, Polygon, BNB
      Chain, Arbitrum, Optimism, Base, Avalanche (live, verified).
- [x] **Multichain send** — asset/network picker, per-network live fees + correct
      chainId broadcast. 🟡 Per-chain token discovery still to do.
- [ ] ⬜ Non-EVM chains (each a separate integration): Litecoin/Dogecoin/BCH
      (reuse the BTC stack — easiest), then XRP, Cardano, Polkadot, Cosmos, Tron…
- [x] **Token discovery** — ERC-20 auto-discovered (Blockscout) + priced
      (CoinGecko by contract), shown in a Tokens section folded into net worth.
      🟡 SPL is best-effort: `getTokenAccountsByOwner` is blocked on free public
      Solana RPCs (publicnode 403) — needs a keyed RPC (Helius/Alchemy).
- [ ] ⬜ Custom token add (paste contract) + SPL via keyed RPC
- [ ] ⬜ DEX swap aggregator (1inch / Jupiter)
- [ ] ⬜ NFT gallery
- [ ] ⬜ WalletConnect v2
- [ ] ⬜ Hardware wallet (Ledger/Trezor)
- [ ] ⬜ Staking, fiat on-ramp

## Pre-launch gate (non-negotiable for real funds)
- [ ] ⬜ **Independent security audit** of `wallet-core` + signing + storage
- [ ] ⬜ Dependency supply-chain review + lockfile pinning + `pnpm audit` in CI
- [ ] ⬜ End-to-end tests on testnet (send/receive/broadcast per chain)
- [ ] ⬜ Bug-bounty + responsible-disclosure policy
- [ ] ⬜ Legal/compliance review (non-custodial posture, jurisdictions, on-ramp KYC)

> ⚠️ **Do not onboard real customer funds before the audit.** A non-custodial
> wallet is irreversible-loss software; the crypto is built on audited libraries
> and tested, but the integrated product must be independently reviewed first.
