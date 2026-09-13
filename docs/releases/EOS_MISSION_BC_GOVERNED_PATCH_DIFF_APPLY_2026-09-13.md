# EOS Mission BC — Governed Patch / Diff Apply Port (SPEC-0060)

**Date:** 2026-09-13 (America/Bogota)  
**Branch:** `grok/mission-bc-governed-patch-diff-apply-port`  
**Base tip (expected StartsWith):** `6685eeb`  
**Full pin:** `6685eeb9d4628395802545306e14bfd244a6ac72` (#273 tip post-#272 · L19 OPEN)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  
**Axis:** Sovereign Delivery & Verification Fabric  
**L17:** CLOSED (never reopen) · **L18:** CLOSED (never reopen; AX–BB MEASURED) · **L19:** OPEN (BC in progress; BD–BG pending)

## Summary

Hermetic in-process Governed Patch / Diff Apply Port under `src/core/delivery/`:

- `applyPatch({ patch, targets, allowlist, policy, engineSeal, notaryObserve, ports })`
- Phases: VALIDATE → GATE → APPLY → SEAL
- Sealed sha256 apply receipts
- Optional injectable AX seal + AQ notarization observe (compose only)

## NON-CLAIM

≠ unsupervised auto-merge SaaS / ≠ GH Actions replacement /
≠ PRODUCTION_READY delivery product / not BD/BE/BF/BG

## Modules

- `governed-patch-diff-apply-port.js`
- `patch-diff-policy-gate.js`
- `apply-receipt.js`
- `patch-diff-boundary.js`

## Tests

`tests/eos-bc-governed-patch-diff-apply-port.test.js` — BC1–BC18 hermetic.

## Host bootstrap

`MISSION_BC_BOOTSTRAP.ps1` → copy → `patch-mission-bc.mjs` →
`test:governed-patch-apply` / `test:mission-bc` → slim≤145 → `verify:strict` →
commit `feat(delivery): Governed Patch / Diff Apply Port (SPEC-0060)` → push.
