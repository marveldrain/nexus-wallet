# Legal documents — status

These are **drafts**, prepared as a starting point so a lawyer has something
concrete to start from instead of a blank page — they are not legal advice
and must not be published or relied on as-is. This directly addresses
[`LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) Phase 6 items (ToS, Privacy
Policy, non-custodial risk disclosures).

| Document | Covers |
|---|---|
| [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) | Usage terms, disclaimers, governing law |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | What data is/isn't collected, third-party services |
| [RISK_DISCLOSURE.md](RISK_DISCLOSURE.md) | Non-custodial-specific risks (irreversibility, no recovery, etc.) |

Every `[PLACEHOLDER — ...]` marker in these files is something only you (or
your attorney) can fill in — they are not things I can complete on your
behalf. The recurring ones across all three documents:

1. **Legal entity name** — Phase 6's "legal entity formed" checklist item is
   currently unchecked. Until you have one, these documents have nowhere to
   anchor liability/contracting party.
2. **Governing law / jurisdiction / dispute resolution** — needs an attorney
   licensed where you're forming the entity and/or launching.
3. **Jurisdiction exclusions** — Phase 6's "jurisdiction analysis" item;
   which countries/regions you will and won't serve (sanctions lists, states
   with specific crypto-wallet restrictions, etc.).
4. **Contact email/address** — should be the same address you put in
   `apps/onboarding/public/.well-known/security.txt`, which also still has
   placeholder values.
5. **Effective dates** — set once you're actually ready to publish.

What these drafts get right that a generic template wouldn't: they're
written against what Nexus *actually does* today (non-custodial, no backend
server, no account/KYC, localStorage-only storage, the exact list of
third-party services the app calls directly from the browser) rather than
generic wallet boilerplate — so the accuracy work is done; the legal
judgment calls (the placeholders) are not, and shouldn't be guessed at.

**Before publishing any of these**: have them reviewed by a lawyer licensed
in the jurisdiction(s) where your entity is formed and where you intend to
operate. Crypto-specific regulation varies significantly by country and
changes often — Phase 6's "jurisdiction analysis" should happen alongside
this review, not after it.
