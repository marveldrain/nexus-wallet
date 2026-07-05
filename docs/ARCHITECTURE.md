# Nexus Wallet — Architecture

## Guiding principle: one audited core, many thin shells

The single most important architectural decision for a wallet is **where the
cryptography lives**. We put 100% of key generation, derivation, signing, and
encryption in one platform-agnostic TypeScript package, `@nexus/wallet-core`,
with **zero** platform, network, storage, or UI dependencies. Every app (desktop,
mobile, extension) is a thin shell around that one package.

Why this matters:

- **Audit once.** Security review and formal audits target a single, small,
  pure-logic surface — not three diverging implementations.
- **No drift.** A Bitcoin address derived on desktop is byte-identical to one
  derived on mobile, because it's literally the same code path.
- **Extensibility.** Adding a chain = implementing one `ChainAdapter`.

This is why we choose **React Native over Flutter** for mobile (see below):
Flutter would force a Dart rewrite of the crypto core, defeating "audit once."

## Monorepo layout (Turborepo + pnpm)

```
nexus-wallet/
├─ packages/
│  ├─ wallet-core/        ✅ built — pure crypto engine (this commit)
│  │   src/
│  │     mnemonic.ts          BIP39 generate/validate/seed
│  │     keyring.ts           unlocked seed → per-chain account derivation
│  │     vault.ts             create/import/unlock (persistence-facing API)
│  │     crypto/
│  │       random.ts          CSPRNG + memory wipe
│  │       encryption.ts      scrypt + XChaCha20-Poly1305 vault
│  │     chains/
│  │       types.ts           ChainAdapter interface
│  │       ethereum.ts        secp256k1 / BIP44 m/44'/60'
│  │       bitcoin.ts         secp256k1 / BIP84 native segwit
│  │       solana.ts          ed25519 / SLIP-0010 m/44'/501'
│  │     errors.ts            typed, user-safe error hierarchy
│  ├─ chain-rpc/          ✅ built — balance/fee/broadcast over public RPCs w/ failover
│  ├─ tx-builder/         ✅ built — per-chain tx construction + signing (offline)
│  ├─ ui-kit/             ⬜ shared React components, design tokens, charts
│  └─ wallet-store/       ⬜ Zustand stores + TanStack Query data layer
├─ apps/
│  ├─ desktop/           Tauri (Rust shell + React renderer)
│  ├─ mobile/            React Native (bare) — Keychain/Keystore + biometrics
│  └─ extension/         MV3: background keyring + EIP-1193 provider injection
└─ docs/
   ├─ ARCHITECTURE.md    (this file)
   └─ SECURITY.md        threat model + mitigations
```

## Platform shell decisions

| Platform   | Choice              | Why |
|------------|---------------------|-----|
| Desktop    | **Tauri** (not Electron) | Rust core, no Node in the renderer → far smaller attack surface; ~10× smaller binary; secrets can be held on the Rust side, away from the webview JS. |
| Mobile     | **React Native (bare)** | Reuses `wallet-core` verbatim; bare (not Expo) for native secure-enclave, biometric, and BLE (Ledger) modules. |
| Extension  | **MV3**             | Keyring lives in the background service worker; content script injects an EIP-1193 / Solana provider for dApp connectivity. |

## Data flow (read vs. sign)

```
       ┌─────────────────────────────── device only ───────────────────────────────┐
       │                                                                            │
 user pw ─▶ scrypt ─▶ vault key ─▶ decrypt vault ─▶ seed (in-memory, Keyring) ──┐    │
       │                                                                        │    │
       │   Keyring.deriveAccount(chain,i) ─▶ {address, pubkey}  ── persist ─────┼──▶ UI (balances)
       │                                                                        │    │
       │   sign(tx): derive privkey ─▶ sign ─▶ wipe(privkey) ─▶ signed tx ──────┘    │
       └────────────────────────────────────────────────────────────────────────────┘
                                               │ signed tx only
                                               ▼
                                     public RPC / Esplora  (no key ever leaves)
```

Public addresses and signed transactions are the only things that touch the
network. Seeds and private keys never leave the device, and private keys are
wiped immediately after each signing operation.

## State & data layer (planned `wallet-store`)

- **Zustand** for wallet/UI state (accounts, selected chain, lock status). Small,
  unopinionated, no boilerplate, easy to keep secrets *out* of.
- **TanStack Query** for all RPC reads (balances, history, prices) — caching,
  retries, and multi-endpoint fallback live here, not in components.

## RPC strategy (planned `chain-rpc`)

- No proprietary backend for core features. Use public RPCs with a **prioritized
  fallback list** per chain (configured via `.env`), automatic failover, and
  request hedging for latency.
- EVM via `viem` transports; Bitcoin via Esplora REST; Solana via `@solana/web3.js`.
- Optional self-hostable indexer later for fast token/NFT discovery — never a
  custodial dependency.
```
