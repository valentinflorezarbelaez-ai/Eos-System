# Proposal — Mission DF Complexity Inventory Remeasure Port (SPEC-0115)

## Why

After L29 CLOSED + L30 audit (ADR-0087 / #413) + tip-open #414, operators need a Layer-0 port that re-measures complexity inventory / ceiling-hold surfaces (Post-L26 inventory, ADR-0075 prune plan, T6 ceiling hold) into sealed `DF-RCPT-*` receipts — without authorizing deletes, flipping PRODUCTION_READY, rewriting tip pins, reopening L29, or auto-closing L30.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `complexity-inventory-remeasure-receipt.js` — sealed `DF-RCPT-*` + freeze soft-observe `36c99107` + ceilingHold
  - `complexity-inventory-remeasure-policy-gate.js` — fail-closed govern preconditions
  - `complexity-inventory-remeasure-port.js` — facade (`govern`, `evaluate`, `getDecision`, `verifyTrail`); soft-observe freeze; soft-import ceiling surfaces
- Hermetic tests `tests/eos-df-complexity-inventory-remeasure-port.test.js` (~17)
- CRLF-safe patcher `scripts/patch-mission-df.mjs`
- OpenSpec change, ADR-0088, evidence, release notes

## Non-goals

- Delete authorization; mass prune; unsupervised delete; PRODUCTION_READY flip; tip-pin rewrite;
  Fundacion writes; GHE; L30 auto-close; L29 reopen; tip-refresh; new schemas JSON;
  rewrite freeze tip pins; CloudAgent / Fundacion push

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L29 | CLOSED — NEVER reopen |
| L30 | OPEN (Audit MEASURED · DF–DJ pending) via tip-open #414 |
| Axis | Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric |
| Freeze pin | `36c99107` (L30 audit #413; soft-observe only) |
| Compose | POST_L26+ADR_0075+T6 required observe; freeze NON-CLAIM soft-observe |
| Ceiling | schemas AT_CEILING 35/35 |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Inventory≠delete | ADR-0075 / Post-L26 A |
| Tip-refresh | NOT this package |
