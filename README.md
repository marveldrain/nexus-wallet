# Nexus Wallet

A beautiful, secure, **non-custodial** multi-chain crypto wallet — Exodus-grade
UX, MetaMask-grade dApp connectivity, BlueWallet-grade Bitcoin focus.

> **Non-custodial means you, and only you, hold the keys.** Nexus never sends or
> stores your seed phrase or private keys on any server.

## Supported today

- **Bitcoin** — native SegWit (BIP84, `bc1q…`)
- **Ethereum + all EVM chains** — Polygon, BSC, Arbitrum, … (BIP44 coin 60)
- **Solana** — ed25519 / SLIP-0010

Extensible: a new chain is one `ChainAdapter` implementation away.

## Monorepo

| Package | Status | Purpose |
|---------|--------|---------|
| [`@nexus/wallet-core`](packages/wallet-core) | ✅ built | Pure crypto engine: BIP39, HD derivation, encrypted vault |
| [`@nexus/tx-builder`](packages/tx-builder) | ✅ built | Offline per-chain transaction build + signing |
| [`@nexus/chain-rpc`](packages/chain-rpc) | ✅ built | Balances, fees, broadcast over public RPCs (with failover) |
| [`@nexus/portfolio`](packages/portfolio) | ✅ built | Pure valuation math + CoinGecko price source |
| [`apps/onboarding`](apps/onboarding) | ✅ built | Full wallet app — onboarding, send/receive, multichain portfolio, activity, security settings, testnet mode (Vite + React + Tailwind) |
| `apps/desktop` (Tauri/Electron), `apps/mobile` (RN), `apps/extension` (MV3) | ⬜ planned | Thin platform shells — see [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) Phase 4 |

See [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) for the full feature
list and what's left before a real public launch (security audit, legal,
production infra, packaging — most of it tracked there, not here).
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md),
and [docs/SENDING.md](docs/SENDING.md) cover how the packages compose into a send.
[docs/PRODUCTION_RPC.md](docs/PRODUCTION_RPC.md) and
[docs/ACTION_ITEMS_FOR_YOU.md](docs/ACTION_ITEMS_FOR_YOU.md) cover what's
needed for a production deployment specifically.

## Quick start

This monorepo's `package.json` declares pnpm, but each package is actually
installed independently with plain npm (the `file:`-protocol references
between `@nexus/*` packages work fine either way) — that's the path that's
actually tested:

```bash
# from nexus-wallet/, build order matters: wallet-core first (others import its dist/)
(cd packages/wallet-core && npm install && npm run build && npm test)
(cd packages/tx-builder   && npm install && npm run build && npm test)
(cd packages/chain-rpc    && npm install && npm run build && npm test)
(cd packages/portfolio    && npm install && npm run build && npm test)
(cd apps/onboarding       && npm install && npm run dev)   # http://localhost:5173
```

`.github/workflows/ci.yml` runs this same sequence (plus the Playwright E2E
suite and an `npm audit` pass) on every push/PR once this repo has a remote.

## Using the core

```ts
import { createWallet, unlockVault, Keyring } from '@nexus/wallet-core';

// 1. Create a new wallet (mnemonic shown ONCE, vault persisted to disk)
const { mnemonic, vault } = createWallet({ password: userPassword });
// → back up `mnemonic`, persist `vault` (it's encrypted)

// 2. Later: unlock and derive addresses
const keyring = unlockVault(vault, userPassword);
const eth = keyring.deriveAccount('ethereum', 0); // eth.address = 0x…
const btc = keyring.deriveAccount('bitcoin', 0);  // btc.address = bc1q…
const sol = keyring.deriveAccount('solana', 0);   // sol.address = base58

// 3. Lock when idle — wipes the seed from memory
keyring.lock();
```

## Security

Read [docs/SECURITY.md](docs/SECURITY.md) before contributing. Core rules:
audited libraries only, no custom crypto, no secrets to any server, keys wiped
after use. Report vulnerabilities privately (see SECURITY.md).
