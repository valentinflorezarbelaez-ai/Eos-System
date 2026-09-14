# Proposal — Mission BD Multi-Worktree / Multi-Target Delivery Port (SPEC-0061)

## Why

Sovereign Delivery & Verification Fabric needs a **governed**, fail-closed
multi-worktree / multi-target delivery port with sealed receipts — without
claiming a multi-tenant cloud fleet, Kubernetes CD, or a PRODUCTION_READY
delivery product.

## What

- `deliver({ artifact, targets, allowlist, policy, applySeal, isolationObserve, federationObserve, ports })`
  → VALIDATE → GATE → DELIVER → SEAL
- Hermetic in-process / virtual-root delivery (NO real git worktree / NO remote CD)
- Allowlist, Fundacion ALWAYS_DENY, BA isolation via injectable ports, optional BC apply seal
- Fail-closed multi-target (any miss DENYs the whole request; no partial success)
- Sealed sha256 delivery receipts
- Optional injectable `anFederation` / `federationObserve` + `baIsolation` /
  `axEngine` + `bcApply` / `applySeal` (compose AN/AX/BA/BC; do not rewrite)

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED)
- L19 OPEN (BC MEASURED; BD in progress; BE–BG pending)
- Axis: Sovereign Delivery & Verification Fabric
- Law VI audit scans **MODULE_DIR only** (`src/core/delivery`)

## Out of scope

BE/BF/BG; rewriting AN/AX/BA/BC; Fundacion writes; CloudAgent; real git
worktree; flipping PRODUCTION_READY.
