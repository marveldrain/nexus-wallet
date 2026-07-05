# What's left that only you can do

Everything in this document requires your money, your accounts, or a
decision only you can make — none of it is something I can complete on your
behalf. It's pulled from the `⛔`/`**Action for you**` markers scattered
across [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md), collected in one place
so you have a punch list instead of having to hunt through the checklist.

Cost figures below are current as of this writing (June 2026) but are
estimates, not quotes — get real quotes before budgeting.

## Do these first (everything else depends on them)

### 1. Create a GitHub remote and push
**Cost: free. Time: 10 minutes.**
I ran `git init` locally and wrote `.github/workflows/ci.yml` +
`.github/dependabot.yml`, but neither runs until a remote exists — GitHub
Actions has nothing to attach to otherwise. Create a repo at
github.com/new (private is the safer default for now, given there's no
audit yet — see #2), then:
```
git remote add origin <your-repo-url>
git add -A && git commit -m "Initial commit"
git push -u origin main
```
I didn't do this for you since it's a visible, somewhat irreversible action
(your code becomes shared state) and the choice of host/visibility is
yours.

### 2. Form a legal entity
**Cost: varies hugely by jurisdiction/structure (roughly $100-$1,000+ in
formation fees alone, more with an attorney's help). Time: days to weeks.**
Blocks Phase 6 entirely — there's nowhere to anchor the Terms of Service /
Privacy Policy / liability disclaimers without one. Talk to a
business attorney about the right structure for a crypto wallet
specifically (LLC vs. other forms have different liability-shielding
implications, and your jurisdiction's crypto-specific regulation matters
here).

## Security (Hard Launch Gates #1, #2)

### 3. Hire an independent security audit firm
**Cost: roughly $15,000-$60,000+ for a focused wallet/crypto-core audit
(get quotes — varies a lot by firm and scope). Time: 2-6 weeks once
engaged, plus your time to remediate findings before re-review.**
This is the single most important Hard Launch Gate and the one most worth
spending real money on — it's reviewing exactly the code that protects
user funds (key derivation, vault encryption, signing). Firms that do this
kind of work: Trail of Bits, NCC Group, Cure53, Least Authority, Kudelski
Security — get quotes from 2-3. Do this once the codebase is feature-frozen
and close to launch-ready (re-doing it after major changes costs more).

### 4. OS-secure key storage — this one's mine, not yours, but it's sequenced behind Phase 4
Not a money/account item — I can build this (iOS Keychain / Android
Keystore / Windows DPAPI) once the native shells exist. It's blocked on
Phase 4 packaging, not on you. Listed here only so it's clear why it's not
done yet despite being a Hard Launch Gate.

## Infrastructure (Hard Launch Gate #5)

### 5. Sign up for production RPC providers
**Cost: usage-billed; budget at least $50-500+/month depending on traffic
(free tiers exist for initial testing).**
Fully documented at [docs/PRODUCTION_RPC.md](PRODUCTION_RPC.md) with
verified URL formats — Alchemy or Infura for EVM chains, Helius for
Solana (also unblocks SPL token discovery). Run
`node scripts/verify-rpc-config.mjs` after pasting in keys to confirm it
actually works.

## Packaging & distribution (Hard Launch Gate #6, Phase 4)

### 6. Windows code-signing certificate
**Cost: roughly $65-400/year for OV, $200-620/year for EV (EV requires a
hardware token + stricter business verification — slower to get, but
avoids unnecessary SmartScreen warnings). Time: OV same-day to a few days;
EV up to ~1-2 weeks for verification.** Needs the legal entity (#2) first —
business verification requires it.

### 7. Apple Developer Program
**Cost: $99/year. Time: usually approved within 24-48 hours, longer if
verification is needed.** Required for macOS notarization and any iOS App
Store listing.

### 8. Google Play Console developer account
**Cost: $25 one-time. Time: usually fast, Google has been tightening
verification requirements for new accounts — budget a few extra days.**
Required for any Android/Play Store listing.

## Legal & compliance (Hard Launch Gate #7, Phase 6)

### 9. Have an attorney review the legal drafts
I wrote starting drafts at [docs/legal/](legal/README.md) (Terms of
Service, Privacy Policy, Risk Disclosure) that are accurate to what the app
actually does, but every jurisdiction-specific clause is an explicit
placeholder. **Cost: varies, plan for at least a few hundred to low
thousands of dollars for a lawyer to review/finalize three documents.**

### 10. Trademark clearance for "Nexus Wallet"
"Nexus" is an extremely common name in tech/crypto — do a trademark search
before launch, not after. **Cost: a basic search is often free/cheap;
formal clearance + filing if you want to register it runs more (a few
hundred to low thousands).**

## Lower priority / can wait until closer to launch

### 11. Bug bounty program
A `security.txt` scaffold exists (with placeholder values still to fill
in) but there's no funded bounty program yet. Self-hosted/lightweight
(just the disclosure channel) is free; a managed platform (HackerOne,
Bugcrowd) has real minimum costs. Reasonable to defer until post-launch
traction justifies it — see Phase 8.

### 12. Error monitoring / crash reporting (e.g. Sentry)
Generous free tiers exist — this is actually something I could wire up for
you when you're ready (it's an integration task, not money-gated), just
hasn't been prioritized yet. Mentioning it here because the "no secrets in
logs" Hard Launch Gate has a loose end specifically waiting on this: there's
nothing to verify secret-scrubbing against until a crash-reporting pipeline
exists.

### 13. Production CoinGecko plan
The free/demo tier (`VITE_COINGECKO_KEY`) is already wired and working.
Only worth upgrading once real traffic volume justifies it — low priority
relative to the RPC item above.
