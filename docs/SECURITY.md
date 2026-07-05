# Nexus Wallet — Security Architecture & Threat Model

Security is the product. A wallet that loses funds is worthless no matter how
pretty it is. This document is the contract the codebase must uphold.

## Crypto choices (battle-tested only — never roll our own)

| Concern             | Primitive                         | Library            |
|---------------------|-----------------------------------|--------------------|
| Mnemonic            | BIP39 (128/256-bit entropy)       | `@scure/bip39`     |
| HD derivation (EVM/BTC) | BIP32 secp256k1               | `@scure/bip32`     |
| HD derivation (SOL) | SLIP-0010 ed25519                 | `ed25519-hd-key`   |
| Hashing/curves      | keccak256, sha256, secp256k1      | `@noble/*`, `viem` |
| Password KDF        | **scrypt** (memory-hard)          | `@noble/hashes`    |
| Vault cipher        | **XChaCha20-Poly1305** (AEAD)     | `@noble/ciphers`   |
| Randomness          | OS CSPRNG via Web Crypto          | platform           |

All chosen libraries are audited, minimal-dependency, and widely deployed.
`Math.random()` is **never** used for anything security-relevant.

## Threat model

| # | Threat | Mitigation |
|---|--------|------------|
| T1 | **Server key theft** | There is no server with keys. Non-custodial by construction; seeds/keys never leave the device. |
| T2 | **Disk theft / device at rest** | Seed stored only as a scrypt+XChaCha20-Poly1305 vault. Without the password, it's opaque. Mobile additionally wraps the key in hardware Keychain/Keystore. |
| T3 | **Weak password brute force** | Memory-hard scrypt (N≥2¹⁶, desktop 2¹⁸) makes offline guessing expensive. Enforce a password strength meter + minimum entropy in the UI. |
| T4 | **Tampered vault** | AEAD (Poly1305 tag) — any modification fails authentication; wrong-password and tamper are indistinguishable (correct property). |
| T5 | **Secrets lingering in memory** | Seed held only while unlocked; private keys wiped immediately after signing; auto-lock on idle/background. (JS can't fully guarantee — hence Tauri Rust side / native enclaves for the highest-value secrets.) |
| T6 | **Phishing / malicious dApp** | Human-readable tx simulation + decoding before signing; domain allow/deny lists; explicit per-origin connection approval; clear "what am I signing" screens; anti-phishing personalized image on unlock. |
| T7 | **Supply-chain (malicious dep)** | Pin versions + lockfile, `pnpm audit` in CI, minimal dependency tree (noble/scure are near-zero-dep), Subresource-Integrity for the extension, reproducible builds, signed releases. |
| T8 | **Clipboard/address swap malware** | Show full address with checksum, chunked display, QR verification, and address-book "known recipient" labels. |
| T9 | **Nonce reuse (AEAD)** | XChaCha20's 192-bit nonce is randomly generated per encryption — collision risk is negligible. Fresh salt + nonce every write (tested). |
| T10 | **Rate/brute force on unlock** | Exponential backoff + attempt counter on the unlock screen; optional wipe-after-N-failures (user opt-in). |
| T11 | **Screen capture / shoulder surfing of seed** | Reveal-to-view, blur by default, screenshot blocking on mobile (FLAG_SECURE), backup-verification quiz before funds can be received. |

## Operational security requirements (enforced by the app layer)

1. **Seed backup flow** — show once, require a randomized word-position quiz to
   confirm the user actually wrote it down before completing onboarding.
2. **Auto-lock** — lock after configurable idle timeout and on app backgrounding;
   `Keyring.lock()` wipes the seed.
3. **Biometric gate (mobile)** — Face ID / fingerprint to unlock the
   hardware-wrapped key.
4. **No telemetry of secrets, ever.** Crash reports scrub addresses, never
   include key/seed material.
5. **Hardware wallet path (Phase 2)** — Ledger/Trezor so the seed never exists in
   the app at all for high-value accounts.

## What we explicitly do NOT do

- Do not store, transmit, or back up seeds/keys to any server or cloud (the user
  may opt into their own encrypted cloud backup, but it's *their* keys, *their*
  password, encrypted *before* it leaves the device).
- Do not implement custom ciphers, KDFs, or RNGs.
- Do not log plaintext secrets, even in dev builds.
