# Proposal — Mission BE Verification Replay & Golden Receipt Port (SPEC-0062)

## Why

Sovereign Delivery & Verification Fabric (L19) needs a **governed**, fail-closed
Verification Replay & Golden Receipt Port that deterministically replays sealed
verify:strict / satellite / delivery receipts and compares them against golden
receipts — without claiming a SIEM product, billing-accuracy SaaS, or a
PRODUCTION_READY verification product.

## Prior art (compose, do not rewrite)

- **BC (SPEC-0060) MEASURED** — hermetic governed patch-diff apply port +
  sealed apply receipts.
- **BD (SPEC-0061) MEASURED** — hermetic multi-worktree / multi-target delivery
  port + sealed delivery receipts (ADR-0019).
- **AJ evidence ledger + AL replay observer MEASURED** — observe surfaces BE
  must compose via injectable ports.

Seam justification: L19 audit (SPEC-0062) records the gap — no typed
replay→golden compare over sealed verify:strict / satellite / delivery
receipts. BC+BD give the sealed artifacts; AJ+AL give observe. BE is the
compare/custody port, not a rewrite of those trees.

## What

- `replay({ candidate, golden, policy, ledgerObserve, autonomyReplayObserve, deliverySeal, applySeal, ports })`
  → VALIDATE → GATE → REPLAY → COMPARE → SEAL
- Hermetic in-process golden map + candidate sealed receipt objects
  (NO real verify:strict subprocess / NO SIEM / NO network)
- Recompute canonical digest (`stableStringify` + `sha256Canonical`) and
  compare against golden; fail-closed DENY on mismatch/drift/custody break
- Fundacion ALWAYS_DENY; optional required BC apply / BD delivery seals;
  HITL DENY; empty / malformed DENY
- Sealed sha256 replay receipts (`BE-RCPT-*`)
- Optional injectable `ajLedger` / `ledgerObserve` + `alReplay` /
  `autonomyReplayObserve` + `bcApply` / `bdDelivery` (compose AJ/AL/BC/BD;
  do not rewrite)

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED)
- L19 OPEN (BC+BD MEASURED; BE in progress; BF–BG pending)
- Axis: Sovereign Delivery & Verification Fabric
- Law VI audit scans **MODULE_DIR only** (`src/core/delivery`)
- ≠ SIEM product / ≠ billing accuracy SaaS /
  ≠ PRODUCTION_READY verification product / not BF/BG

## Out of scope

BF/BG; rewriting AJ/AL/BC/BD; Fundacion writes; CloudAgent; live
verify:strict subprocess; SIEM streaming; flipping PRODUCTION_READY;
soft-match / continue-on-drift.
