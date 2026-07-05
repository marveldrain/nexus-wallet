# Privacy Policy (DRAFT)

> ⚠️ **This is a draft prepared as a starting point, not legal advice.** It
> must be reviewed and approved by a licensed attorney in your jurisdiction
> before publishing. See [README.md](README.md) for what still needs filling
> in (entity name, jurisdiction, contact, GDPR/CCPA-specific language if you
> have EU/California users).

_Last updated: [DATE]_

[LEGAL ENTITY NAME] ("**we**", "**us**") operates Nexus Wallet (the "**App**").
This policy explains what data the App handles and why. The short version:
**Nexus is non-custodial — we do not run a backend server that sees your
data, and we never have access to your recovery phrase, private keys, or
funds.**

## What we don't collect

We do not require an account, email address, phone number, or any
identifying information to use the App. We do not collect or have access to
your recovery phrase or private keys at any point — they're generated and
encrypted on your own device and never transmitted anywhere. We do not
currently use cookies or any analytics/tracking SDK. [PLACEHOLDER — if/when
you integrate an analytics or crash-reporting tool (see
LAUNCH_CHECKLIST.md Phase 5), this policy must be updated before that ships,
with specifics on what's collected and an opt-out if applicable.]

## What's stored, and where

Everything the App needs to function is stored **locally on your device**,
in your browser's `localStorage` — never on a server we operate (we don't
operate one):
- Your encrypted wallet vault (recovery phrase + optional passphrase,
  encrypted with a key derived from your device password; we cannot decrypt
  this without your password, and don't have a copy of it to try).
- Your address book / contacts, custom token list, and app settings
  (currency, network mode, auto-lock preference).

Uninstalling the App, clearing your browser's site data, or using a
different device/browser removes this local data. **We cannot back it up or
restore it for you** — only your written-down recovery phrase can.

## Data sent to third parties

To show balances, prices, and transaction history, and to broadcast
transactions, the App makes requests **directly from your browser** to
third-party services — these requests are not proxied through any server we
operate, so we never see them, but the third party does (including your IP
address and the wallet address you're querying). As of this writing, these
are:

| Purpose | Provider(s) |
|---|---|
| Bitcoin balance/fees/broadcast | Blockstream (blockstream.info), mempool.space |
| Ethereum & EVM-chain RPC | publicnode.com, drpc.org, blastapi.io (or a provider you configure, e.g. Alchemy/Infura) |
| Solana RPC | publicnode.com, api.mainnet-beta.solana.com (or a provider you configure, e.g. Helius) |
| Ethereum transaction history & token discovery | Blockscout (blockscout.com instances) |
| Prices & market data | CoinGecko (api.coingecko.com) |
| .sol name resolution | Bonfida's public resolver proxy |
| .eth name resolution | Ethereum mainnet (via the RPC providers above) |

Outbound links to block explorers (Etherscan, Solscan, etc.) when you tap
"View on explorer" similarly leave the App and are subject to that explorer's
own privacy policy. Each provider above has its own privacy policy governing
what they do with requests they receive; we encourage reviewing theirs if
this is a concern (notably, blockchain addresses and balances are public
information by design — that part isn't private regardless of which app you
use to view it).

[PLACEHOLDER — if you operate your own server-side proxy/indexer in the
future (e.g. for a keyed RPC plan you don't want to expose client-side, or a
backend API), this section must be rewritten: at that point we *would* see
this traffic and this policy needs to say so.]

## Children's privacy

The App is not directed at children under 13 (or the relevant age of consent
in your jurisdiction) and we do not knowingly collect data from them.
[PLACEHOLDER — confirm the correct age threshold for your target markets;
COPPA (US) uses 13, GDPR-adjacent rules in some EU states use 16.]

## Your rights

[PLACEHOLDER — if you have EU or California users, this section needs
GDPR/CCPA-specific language about data subject rights (access, deletion,
portability). Given the App currently stores nothing on any server we
operate, most of these rights are moot for App data (there's nothing on our
servers to access or delete) — but get this confirmed by counsel rather than
assuming, especially once any backend/analytics exists.]

## Changes to this policy

We may update this policy as the App changes (e.g. adding a backend feature,
analytics, or a new third-party integration). [PLACEHOLDER — state how
you'll notify users of material changes, e.g. an in-app notice or a dated
changelog at this URL.]

## Contact

[PLACEHOLDER — support/contact email or address. This should match
`apps/onboarding/public/.well-known/security.txt`, which also currently has
placeholder values that need filling in before launch.]
