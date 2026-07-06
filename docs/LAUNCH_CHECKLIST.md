# Nexus Wallet — Complete Launch Checklist

When every box here is checked, Nexus is ready to ship to real users with real
funds. Items are grouped by phase and roughly ordered. `[x]` = done & verified.

> 🚦 **The "Hard Launch Gates" section at the bottom lists the non-negotiables.**
> Do not onboard real customer funds until every gate is green.

---

## Phase 0 — Foundation ✅ (done)

- [x] Turborepo monorepo + shared packages (wallet-core, tx-builder, chain-rpc, portfolio)
- [x] BIP39 create/import (12/24 words) + optional passphrase support in core
- [x] Encrypted vault — scrypt + XChaCha20-Poly1305 (authenticated)
- [x] HD derivation: Bitcoin (BIP84), EVM (BIP44, multichain), Solana (SLIP-0010)
- [x] Onboarding flow: password + strength meter, seed reveal, backup-verification quiz
- [x] Unlock with rate-limit backoff
- [x] Live multichain balances + prices (7 EVM chains + BTC + SOL)
- [x] Send (real signing + broadcast), Receive (QR), Activity (live history)
- [x] Watch-only address mode
- [x] ERC-20 token discovery (Ethereum)
- [x] Branding: nexus-crystal logo
- [x] 37 automated tests across packages; strict TypeScript
- [x] **Production build actually works** (2026-06-28 finding) — every prior
      verification in this project used the dev server (`npm run dev`) or
      `tsc -b` typechecks; `npm run build`'s `vite build` step (the thing
      that produces what you'd actually deploy/package) had **never once
      been run successfully**. It failed with an ENOENT trying to load
      `vite-plugin-node-polyfills/shims/buffer` from the wrong path — a
      known upstream interaction between Vite 6's Rollup-based production
      resolution and this monorepo's symlinked `file:` cross-package
      dependencies (dev mode's resolution path doesn't hit it). Fixed with
      `resolve: { preserveSymlinks: true }` in `vite.config.ts`. Verified
      the fix is real, not just error-suppression: built `dist/`, served it
      with `vite preview`, and drove a full real wallet-creation flow
      against the actual minified bundle via Playwright — 24 words
      generated, zero console/page errors. 🟡 Noted but not addressed: the
      main JS chunk is 2.64 MB (786 KB gzipped) with no code-splitting —
      fine functionally, worth revisiting for load-time UX before a real
      public launch (dynamic-import the heavier deps: `@solana/web3.js`,
      `viem`, `qrcode`).

---

## Phase 1 — Core wallet completeness

- [x] **Multichain send** — asset/network picker on Send (BTC, SOL, + 7 EVM
      networks); per-network live fees + correct chainId broadcast. Verified.
- [x] **Custom token add** — paste an ERC-20 contract → live preview (symbol/
      name/balance from the contract) → tracked in the Tokens list with remove.
      Verified. 🟡 Per-chain (non-mainnet) token discovery still to do.
- [x] **SPL token discovery via a keyed Solana RPC** — `getSolanaTokens()`
      already accepted an arbitrary RPC URL list; the only missing piece was
      a documented, verified path to an actual keyed provider. See
      [docs/PRODUCTION_RPC.md](../docs/PRODUCTION_RPC.md) — Helius recommended
      (verified URL pattern `https://mainnet.helius-rpc.com/?api-key=<KEY>`).
      🟡 Code path is ready and `scripts/verify-rpc-config.mjs --sol-holder=
      <addr>` can prove it end-to-end, but it still needs YOU to actually sign
      up and paste in a real key — no free key exists for me to test with.
- [ ] Solana transaction amounts in history (getTransaction follow-up)
- [x] **Multi-account** — HD account-index switcher (same index across every
      chain), naming/rename, "+ Add account" derives + auto-switches. Verified
      live: two accounts produce genuinely distinct addresses, switching
      reloads balances, names persist and show in the dashboard header.
- [x] **Address book** — labeled contacts (auto-detects EVM/BTC/SOL), managed in
      a dedicated screen, quick-pick chips in Send (filtered by chain). Verified.
- [x] **ENS** name resolution in Send (`vitalik.eth` → address, live)
- [x] **SNS** name resolution in Send (`bonfida.sol` → address, live, via
      Bonfida's free public resolver proxy)
- [x] **Transaction detail view** — tapping an Activity row opens an in-app
      detail screen (status, full date, counterparty address, copyable txid,
      explorer link) instead of just linking out. Verified live with real
      transaction data including a "Failed" status and counterparty address.
      🟡 "What am I signing" decode/simulation for arbitrary contract calls
      (relevant once dApp/WalletConnect exists) still to do — our own Send
      review already shows full structured details for simple transfers.
- [x] **Fee controls** — slow/avg/fast tiers on Send (EVM EIP-1559 priority-fee
      tiers; Bitcoin sat/vB tiers from Esplora), selecting a tier drives the
      actual signed transaction. Verified live (real BTC spread: slow/avg
      ≈0.000001 BTC, fast ≈0.000002 BTC). 🟡 Custom gas + speed-up/cancel (RBF)
      still to do.
- [x] BIP39 **passphrase ("25th word")** toggle in create + import (advanced) — verified
- [x] **Real portfolio value chart** — 24h history per held asset (CoinGecko
      market_chart) × current holdings, summed across chains; degrades to a
      synthetic placeholder if the fetch fails (rate limit, offline). Verified
      live: real 289-point series rendered, total matched holdings × live price
      × currency conversion exactly.
- [x] **Fiat currency selection** — Settings screen, 7 currencies (USD/EUR/GBP/
      JPY/CAD/AUD/INR), live re-pricing via CoinGecko vs_currency. Verified:
      switching to EUR correctly re-priced the whole dashboard (ratio matched
      the real EUR/USD rate).
- [ ] Additional non-EVM chains as desired (LTC/DOGE/BCH first — reuse BTC stack)
- [ ] Empty / loading / error state audit on every screen
- [ ] Responsive + (optional) light mode QA

---

## Phase 2 — Security & safety 🔒 (critical)

- [ ] **Independent third-party security audit** of wallet-core, signing,
      storage — ⛔ requires hiring an external firm; not something buildable
      in-session. Budget time + cost for this before real funds.
- [ ] Remediate all audit findings + re-review — blocked on the above.
- [x] **OS-secure key storage** per platform — 🟡 Windows desktop DONE
      (DPAPI via Electron `safeStorage`, see Phase 4; verified the on-disk
      vault is a DPAPI blob, not readable JSON). iOS Keychain / Android
      Keystore still pending their shells; the plain web build still uses
      `localStorage` by design (browser has no OS keystore API).
- [x] **Auto-lock** on idle timeout + lock-on-blur — configurable in Settings
      (1/5/15/30 min/Never; "lock when tab loses focus" toggle). Verified live:
      idle timer locks after the threshold, real activity resets it, blur-lock
      fires immediately on tab hide.
- [ ] **Biometric unlock** (Face ID / fingerprint) — ⛔ mobile-only; no mobile
      app exists yet (Phase 4).
- [x] Settings: **change password** — re-encrypts the vault under a new
      password (requires the current one); the underlying secret is verified
      byte-identical before/after. Verified live end-to-end, including that
      the old password stops working and the new one unlocks normally.
- [x] Settings: **reveal seed with re-authentication** — requires the current
      password, blurred-by-default reveal, clipboard auto-clears after copy.
      Verified live (correct password reveals the real 24 words; wrong
      password is rejected).
- [ ] **Hardware wallet** support (Ledger / Trezor) — a substantial standalone
      feature; not attempted this round.
- [ ] Anti-phishing: per-user unlock image; domain/permission warnings for
      dApps — not built yet (the dApp-warning half needs WalletConnect/the
      extension to exist first).
- [x] **Wipe after N failed unlock attempts** — opt-in (off by default), with
      a clear destructive-action warning in Settings. Verified live: 5
      consecutive wrong passwords wiped the vault and showed a notice banner
      on Welcome.
- [x] **Memory hygiene review** — read through every `deriveAccount`/signing
      call site. Found and fixed a real gap: the dashboard's address list and
      the Accounts screen were calling `deriveAccount` (which returns the
      private key) just to read `.address`, leaving unwiped key material in
      memory on every unlock/account-switch/render. Added
      `Keyring.deriveAddress()` — derives, reads the address, wipes the key,
      returns only the address — and switched both call sites to it. All
      actual signing call sites in `data/send.ts` already wipe correctly.
- [x] **No secrets in logs / telemetry / crash reports** — was spot-checked
      only; now systematic. `scripts/check-no-secret-logs.mjs` scans every
      production source file (excludes test/e2e, where e.g. "seed" is a
      legitimate PRNG param, not a wallet secret) for any `console.*` call
      referencing a secret-shaped identifier (mnemonic/passphrase/
      privateKey/seed/password/secretKey), wired into CI so a future regression
      fails the build instead of relying on a human re-grepping by hand.
      Verified the detector actually works (not just that it passes): injected
      a one-line leak, a multi-line leak, and a suppressed-via-comment case
      into a real file — caught both real leaks, correctly ignored the
      suppressed one, restored the file after. Currently 0 findings across 68
      files. 🟡 No crash-reporting tool integrated yet (nothing to scrub
      secrets from until one exists) — tracked in Phase 5.
- [x] **Clipboard auto-clear** — the recovery-phrase copy actions (onboarding
      reveal + Settings reveal) clear the clipboard ~30s after copying.
      Regular address copies are left as instant (addresses aren't secret).
- [ ] Screenshot blocking on mobile (FLAG_SECURE) — ⛔ mobile-only, no mobile
      app yet.
- [x] **Supply chain** — ran `npm audit` across every package; found and fixed
      a high-severity `ws` DoS (added a safe `overrides` pin to `^8.21.0`,
      confirmed via `npm ls` + re-audit, all 40 tests still pass). Remaining
      findings are either dev-tooling-only (vite/vitest/esbuild — never
      shipped to users) or the known `@solana/web3.js`→`jayson`→`uuid` chain
      (low practical exploitability for our usage; no fix without a breaking
      web3.js v2 migration — tracked, not forced).
      **Now automated**: `.github/workflows/ci.yml` runs `npm audit
      --audit-level=high --omit=dev` per package on every push/PR (verified
      passes cleanly against the current dependency state — only the already-
      reviewed moderate findings remain, nothing high/critical); a separate
      job runs the full build+unit-test+Playwright-E2E suite the same way.
      `.github/dependabot.yml` watches all 5 packages + GitHub Actions
      versions weekly. `scripts/generate-sbom.mjs` produces a CycloneDX SBOM
      per package (verified: 79-874 components each) — run before each
      release. 🟡 Extension SRI N/A (no browser extension built yet).
      **Action for you**: push this repo to a GitHub remote — these
      workflows only run once one exists. A local `git init` was done, but I
      won't create or push to a remote without you deciding where it lives.
- [ ] **Reproducible builds** + **signed releases** — ⛔ depends on Phase 4
      packaging existing first.
- [ ] Penetration test of the packaged apps — ⛔ needs packaged apps + an
      external tester/firm.
- [ ] Bug bounty + responsible-disclosure policy — 🟡 a `security.txt`
      (RFC 9116) scaffold now exists at
      `apps/onboarding/public/.well-known/security.txt`, but it has
      **placeholder contact/domain values that must be filled in** before
      launch, and there's no actual bounty program or disclosure-timeline
      commitment yet.

---

## Phase 3 — Quality & testing

- [x] **Testnet mode** — Settings → Network toggle switches to Bitcoin
      testnet3, Ethereum Sepolia, and Solana devnet. Bitcoin derives a
      genuinely separate "tb1…" identity (SLIP-44 coin type 1, distinct
      keypair — not just a re-encoded mainnet address); Ethereum/Solana reuse
      their mainnet address (same address space). Watching an arbitrary
      address always stays on mainnet regardless of this toggle. Verified
      live: toggle re-derives the BTC address correctly both directions, Send
      shows exactly the 3 testnet assets, live fee estimates pulled from real
      Bitcoin-testnet/Sepolia endpoints, a real funded testnet address
      (`tb1qw508d...`, holds 0.00119304 tBTC) passes recipient validation.
      Node-level proof: our `chain-rpc` client correctly reads vitalik.eth's
      real 58.5 Sepolia ETH balance against the testnet config. Tokens/EVM-L2
      expansion are explicitly mainnet-only — testnet mode is a QA tool for
      the 3 core signing families, not a mirror of every mainnet feature.
- [x] **End-to-end send/receive/broadcast verified on testnet** — 🟡
      partially: transaction *building + signing* is proven correct for
      testnet via dedicated unit tests (real `tb1…` keys, `finalize()`
      signature validation, and a test confirming a network/address mismatch
      is correctly rejected). *Funded* round-trip (faucet → our wallet → real
      broadcast → confirmation) was **not completed** — this sandbox's
      Solana-devnet airdrop hit a hard daily IP rate limit, and BTC
      testnet/Sepolia have no captcha-free programmatic faucet reachable from
      here. **Action for you**: fund the wallet's testnet BTC/Sepolia-ETH/
      devnet-SOL address (shown in Receive after switching to testnet mode)
      from a faucet — https://faucet.solana.com (devnet),
      https://sepoliafaucet.com or similar (Sepolia), any BTC testnet3 faucet
      — then send a small amount through the app's own Send screen to close
      this gate with a real broadcast + confirmation.
- [ ] Expanded derivation/conformance test vectors (more paths + edge cases)
- [x] **E2E UI tests (Playwright)** — 11 tests across 3 spec files, all
      driving the real app (real scrypt encryption, real BIP39 generation,
      real backup-verification quiz, real chain derivation, real live ENS
      resolution) through actual rendered UI, not mocks: wallet creation +
      real BTC/ETH/SOL address derivation, weak-password and mismatched-
      password rejection, invalid-recovery-phrase rejection, create → lock →
      unlock round-trip (wrong password rejected, correct password restores
      the same address), Send-screen recipient/amount validation (invalid
      address rejected, balance-exceeded blocks Review, live ENS resolution
      of `vitalik.eth`), full asset-picker coverage (all 8 EVM networks +
      BTC + SOL), and the testnet toggle end-to-end (banner appears, BTC
      address becomes a genuinely distinct `tb1…` identity, Send shows the
      3 testnet-only assets, toggling back to mainnet fully restores state).
      11/11 passing in ~14s, stable across repeated runs.
- [x] **Property/fuzz tests for amount parsing + transaction building** —
      seeded (reproducible) fuzzing: 200 cases/chain for amount parsing
      (round-trips exactly against a reference bigint formula; rejects every
      malformed input fuzzed); 150 randomized scenarios for Bitcoin tx
      building that **decode the actual signed transaction** and verify
      `inputs === outputs + fee` exactly — a non-circular check since it
      doesn't trust the builder's own selection logic.
      **Found and fixed a real bug**: `parseEvmAmount` (via viem's
      `parseUnits`) silently accepted `"5."`/`".5"` and silently *truncated*
      excess decimal precision instead of rejecting it — inconsistent with
      BTC/SOL's stricter parser and contradicting this module's own "never
      lose precision silently" design. Unified all three under one strict
      validator.
- [x] **RPC failover / outage resilience tests** — extended chain-rpc's
      `fetchJson`/`fetchText` test coverage with malformed-body and mixed-
      failure scenarios. **Found and fixed a real bug**: an endpoint
      returning HTTP 200 with a malformed JSON body (a maintenance page, a
      truncated response, a misconfigured proxy — all real-world failure
      modes) bypassed failover entirely, because the response was parsed
      *after* the retry loop returned. Moved parsing inside the per-endpoint
      try/catch so a parse failure now correctly falls through to the next
      endpoint, same as a network error or non-2xx status.
- [ ] Accessibility (a11y) audit
- [ ] i18n framework + key languages
- [ ] Manual QA matrix (OS versions, devices, screen sizes)
- [ ] Closed beta (TestFlight / Play closed testing / desktop preview)

---

## Phase 4 — Platform packaging & distribution

**Desktop (Windows `.exe` + macOS/Linux)**
- [x] **Choose & build: Electron** (Node-only — this machine has no Rust/MSVC
      for Tauri; Electron is also what Exodus ships). `apps/desktop/`:
      hardened shell (contextIsolation, no nodeIntegration, sandboxed
      renderer, all navigation blocked, window.open → system browser
      https-only, every permission request denied) wrapping the onboarding
      app's production build. Electron 43.0.0 (upgraded from 37 specifically
      to clear all `npm audit` advisories — 0 vulnerabilities). VERIFIED by
      a 14-assertion Playwright-driven E2E (`apps/desktop/test-desktop.mjs`)
      run against BOTH the dev shell AND the packaged exe: real wallet
      creation, sandbox actually enforced (no require/process in renderer),
      full relaunch→unlock round-trip. Live network reads confirmed working
      from the packaged app's file:// origin (watched address loaded a real
      $17.6k multichain balance + prices).
- [ ] Code-signing certificate (Windows OV/EV) + sign installer — ⛔ needs
      you to buy a cert (see docs/ACTION_ITEMS_FOR_YOU.md #6). Until then
      Windows SmartScreen will warn on the unsigned installer.
- [ ] macOS: Apple Developer ID signing + **notarization**; `.dmg` — ⛔
      needs a Mac to build on + Apple Developer account.
- [ ] Auto-update (signed) — blocked on the signing cert; updates must never
      ship unsigned. Installer/uninstaller: ✅ NSIS one-click installer built
      (`apps/desktop/release/Nexus Wallet Setup 0.1.0.exe`, ~104 MB).
      🟡 App icon is Electron's default until a `logo.png`/`.ico` is added
      (apps/onboarding/public/logo.png still pending from you).
- [x] **OS-secure storage wired** (Hard Launch Gate #2 for desktop) — vault
      blob (already scrypt+XChaCha20-Poly1305 under the password) is
      additionally wrapped with Electron `safeStorage` (Windows DPAPI /
      macOS Keychain / Linux libsecret) and written to
      `%APPDATA%/Nexus Wallet/vault.dat` — NOT localStorage. Verified on
      disk: the file is a DPAPI blob envelope with no readable vault
      structure. Web build behavior unchanged (localStorage), switched via
      `apps/onboarding/src/data/vaultStorage.ts` + the desktop preload
      bridge. Graceful fallback + `secure:false` flag if an OS keystore is
      unavailable (rare Linux setups).

**Mobile (iOS + Android)**
- [ ] React Native bare app sharing the TS core
- [ ] iOS: Apple Developer account, provisioning, App Store Connect listing
- [ ] Android: Play Console account, signing keystore, AAB build
- [ ] Biometrics + Keychain/Keystore integration
- [ ] Push notifications (incoming tx) + deep links (WalletConnect / payment URIs)

**Optional but high-value**
- [ ] Browser extension (MV3) + EIP-1193 provider for dApp connectivity
- [ ] WalletConnect v2 across platforms
- [ ] Unified versioning / release strategy

---

## Phase 5 — Infrastructure & operations

- [ ] **Production RPC endpoints** (keyed: Alchemy/Infura/Helius) w/ fallback
      — public RPCs are not reliable enough for production. 🟡 Mechanism +
      docs + verification script ready, see Hard Launch Gate #5 above —
      needs you to actually sign up and pay for a plan.
- [ ] Price feed plan (CoinGecko paid tier or alt) + rate-limit handling
- [ ] Token/NFT indexer keys (Blockscout/Etherscan/Helius)
- [ ] Error monitoring (e.g. Sentry) with secret scrubbing
- [ ] Privacy-preserving, opt-in analytics (no addresses / PII)
- [ ] CI/CD pipeline: build → test → sign → release for every platform
- [ ] Secrets management (env/secret store, nothing committed)
- [ ] Uptime / status monitoring; on-call
- [ ] Backend services (if any indexer/relayer) — hosting, scaling, monitoring

---

## Phase 6 — Legal & compliance

- [ ] Legal entity formed — ⛔ requires the user; nothing I can do here
- [x] **Terms of Service** + **Privacy Policy** — 🟡 drafts written at
      [docs/legal/](../docs/legal/README.md), accurate to what the app
      *actually does* today (non-custodial, no backend, no KYC, exact list
      of third-party services called from the browser) — but every
      jurisdiction/entity-specific clause is an explicit `[PLACEHOLDER]`
      that needs a real attorney, not guessed at. **Not publishable as-is.**
- [x] Non-custodial risk disclosures (irreversibility; "we cannot recover
      funds/keys") — 🟡 draft at
      [docs/legal/RISK_DISCLOSURE.md](../docs/legal/RISK_DISCLOSURE.md),
      same caveat as above.
- [ ] Jurisdiction analysis (where you may offer the app)
- [ ] **App Store / Play Store policy compliance** (crypto-wallet rules, age rating)
- [ ] **Trademark/name clearance** for "Nexus Wallet" (Nexus is widely used — verify)
- [ ] Open-source license review (deps + your license)
- [ ] Data protection (GDPR/CCPA) if any analytics collected
- [ ] **Export/encryption compliance** (US EAR/ECCN self-classification for stores)
- [ ] If/when adding fiat on-ramp: KYC/AML via provider + money-transmitter review

---

## Phase 7 — Pre-launch & launch

- [ ] Audit sign-off + all blockers closed
- [ ] Production config review — disable demo/mock flags (`USE_LIVE`, mock data)
- [ ] Marketing site / landing page + app store listings (screenshots, copy)
- [ ] User docs: help/FAQ, recovery guide, supported-asset list
- [ ] Support channel (email / Discord / help desk)
- [ ] Incident-response runbook (malicious dep, RPC outage, critical bug, key-leak)
- [ ] Phased/soft launch plan
- [ ] Cross-team launch sign-off (eng + security + legal)

---

## Phase 8 — Post-launch

- [ ] Monitoring dashboards + on-call rotation live
- [ ] Bug bounty live
- [ ] Dependency + security update cadence
- [ ] User feedback loop
- [ ] Growth roadmap: swaps (Jupiter/1inch), staking, fiat on-ramp, NFT gallery, more chains

---

## 🚦 Hard Launch Gates (cannot ship to real funds without ALL of these)

1. [ ] **Independent security audit passed** and findings remediated
2. [ ] **OS-secure key storage** on every shipped platform (no `localStorage`)
      — 🟡 DONE for the Windows/desktop build (DPAPI via Electron
      safeStorage, verified on disk); still applies to any future web
      deployment (inherently localStorage — consider desktop-only launch)
      and to mobile (Keychain/Keystore) when those shells exist.
3. [ ] **Auto-lock** + verified **no secrets in logs / crash reports** — 🟡
      auto-lock done & verified; "no secrets in logs" now has a systematic,
      CI-enforced check (see Phase 2) — the one remaining piece is that no
      crash-reporting tool is integrated yet, so there's nothing to verify
      secret-scrubbing against in that specific pipeline (Phase 5).
4. [ ] **Testnet-verified** send & receive on **every supported chain** — 🟡
      testnet mode + signing correctness done; needs a real funded round-trip
      (see Phase 3) to close
5. [ ] **Production keyed RPC** infrastructure with fallback — 🟡 the
      mechanism is built, verified, and documented
      ([docs/PRODUCTION_RPC.md](../docs/PRODUCTION_RPC.md):
      `scripts/verify-rpc-config.mjs` confirms all 8 EVM networks + Bitcoin +
      Solana are independently reachable, with exact verified URL formats for
      Alchemy/Infura/Helius). **Action for you**: sign up with a provider and
      paste the keys into `apps/onboarding/.env` — this is a paid step I
      cannot complete on your behalf.
6. [ ] **Code-signed & notarized** builds for each platform
7. [ ] **Legal**: ToS, Privacy Policy, store compliance, name/trademark cleared
8. [ ] **Incident-response** plan + responsible-disclosure channel in place
