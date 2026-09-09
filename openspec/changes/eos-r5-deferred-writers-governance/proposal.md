# Proposal — EOS R5 deferred writers governance (post-Q5)

## Why

Ladder 6 audit K5: Q5 routed the *selected* mission-artifact scope through Write Barrier + `.missions` envelope. Explicit deferred residuals remain: HashChainedLedger internal persist/recovery writes (`epistemic-evidence-engine.js` writeFileSync ~314/349), `ledger-recovery.js` writeFileSync ~30, and other non-selected `src/core` writers. Operators need either an honest audited route **or** a fail-closed NON-CLAIM that they remain internal by design — not silent drift.

## What

Investigate then choose (documented in design.md):

- **A)** Route named subset (HashChainedLedger persist / ledger-recovery) through Write Barrier allowlist + thin envelope without parallel EVD ledger and without breaking epistemic invariants.
- **B)** If A would violate L0 purity / dual-ledger / custody semantics → ranked inventory + fail-closed verify lock that required NON-CLAIM sections exist; deferred writers remain internal by design; tests prove the lock.

Deliverables either way: OpenSpec first, TDD RED→GREEN, Spanish evidence, freeze note, `test:r5`, push branch `cursor/eos-r5-deferred-writers-governance`, no PR open/merge. PRODUCTION_READY=NO. Fundacion Δ=0. App Fuerza intact. No parallel EVD ledger. No P6 prune.

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested Spec-Driven Development + Strict TDD. Substantial governance honesty surface — not DIRECT.

## NON-goals

- Fake route theater that wraps ledger recovery in mission-artifact `.missions` envelope
- Expanding Write Barrier SSOT allowlist to `.eos` / `.eos/ledger` without honest append-path governance
- Parallel EVD ledger / second hash-chain (ADR-0015)
- App Fuerza / Fundacion / PRODUCTION_READY flip
- Executing P6 prune
- New root npm dependencies
- Re-proposing Q5 selected mission-artifact routing

## Approach

OpenSpec → investigate A vs B → document decision → RED tests → minimal lock/inventory (or route) → GREEN → evidence → commit/push (no PR merge).
