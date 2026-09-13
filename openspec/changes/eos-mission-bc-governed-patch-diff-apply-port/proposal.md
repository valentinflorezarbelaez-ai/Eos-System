# Proposal — Mission BC Governed Patch / Diff Apply Port (SPEC-0060)

## Why

Sovereign Delivery & Verification Fabric needs a **governed**, fail-closed
patch / diff apply port with sealed receipts — without claiming unsupervised
auto-merge SaaS, GH Actions replacement, or a PRODUCTION_READY delivery product.

## What

- `applyPatch({ patch, targets, allowlist, policy, engineSeal, notaryObserve, ports })`
  → VALIDATE → GATE → APPLY → SEAL
- Hermetic in-process / virtual-FS apply (NO real git apply / NO GH API)
- Allowlist, Fundacion ALWAYS_DENY, Law VI leak DENY, optional AX engine seal + HITL
- Sealed sha256 apply receipts
- Optional injectable `axEngine` / `axSeal` + `aqNotary` / `aqObserve` (compose
  AX/AQ; do not rewrite)

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED); L19 OPEN
- Axis: Sovereign Delivery & Verification Fabric; BD–BG pending
- Law VI audit scans **MODULE_DIR only** (`src/core/delivery`)

## Out of scope

BD/BE/BF/BG; rewriting AX/AQ; Fundacion writes; CloudAgent; real git apply;
flipping PRODUCTION_READY.
