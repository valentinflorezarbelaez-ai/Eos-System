# ADR-0060 — Mission CO Release Integrity & Progressive Honesty Governor Port

- **Status:** Accepted — local governed (Ladder 26 Satellite 4)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric)
- **Spec:** SPEC-0098

## Context

Freeze/matrix honesty and CN/CM/CL custody digests exist; EOS lacked a Layer-0 release-integrity / progressive-honesty governor that binds Spec↔Code↔Evidence (+ SBOM attest) before candidacy, with sealed `CO-RCPT-*` — without claiming Argo/Flagger progressive-delivery product, real canary, GHE enforcement, or a PRODUCTION_READY flip. ADR-0059 remains the post-L26 perfection backlog (do not consume that number here).

## Decision

1. Implement three Layer-0 modules under `src/core/release/`:
   - `release-integrity-receipt.js`: Nine-field SHA-256 sealed `CO-RCPT-*`.
   - `release-integrity-policy-gate.js`: Fail-closed govern-plan validation.
   - `release-integrity-port.js`: `govern` / `evaluate` / `verifyTrail` / `getDecision`.
2. Valid plan + honestyMode:
   - `PROMOTE` → PASS (hermetic candidacy — NOT real deploy)
   - `HOLD` → HOLD
   - `ROLLBACK_HINT` → HOLD (non-promote progressive honesty)
   Gate reject → DENY (sealed).
3. Exclude satellite test from slim; opt-in via `npm run test:mission-co`.
4. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM Argo/Flagger / real canary / progressive-delivery SaaS / GHE / PRODUCTION_READY flip.
5. Do **not** tip-refresh / implement CP in this mission. Human remains authority on irreversible promote.

## Alternatives REJECTED

- Argo/Flagger / real canary / progressive-delivery SaaS as product surface — hermetic Layer-0 labels only.
- GHE enforcement / Fundacion writes / PRODUCTION_READY=YES / tip-refresh / CP / reopen L17–L25.

## Consequences

- Positive: Sealed release-integrity governor with PASS|DENY|HOLD + chained CO receipts; 18 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not Argo/Flagger progressive-delivery product.
- Invariants: PRODUCTION_READY=NO; L17–L25 never reopen; human authority on irreversible promote.

## NON-CLAIMS

- ≠ Argo/Flagger progressive-delivery SaaS / ≠ real canary / ≠ GHE enforcement
- ≠ Fundacion writes / PRODUCTION_READY=NO / ≠ tip-refresh / ≠ CP
