# ADR-0070 — Mission CR Evidence Trail Ritual Binding Port

- **Status:** Accepted — local governed (Ladder 27 Satellite 2)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric)
- **Spec:** SPEC-0101

## Context

Post-L26 Workstream D delivered the Evidence Trail Ritual design (ADR-0065) + sample fixture `evidence-trail-cl-cm-cn.sample.json`, but EOS lacked a Layer-0 **port** with sealed receipts (`CR-RCPT-*`) that validates append-only CL→CM→CN linkage under fail-closed policy — without claiming SIEM, production data lake, auto-close L26, new schemas JSON, or a PRODUCTION_READY flip. Ladder 27 is OPEN (Audit MEASURED · CQ MEASURED · CR–CU pending) after Mission CQ #377 tip `2ed747e8`. ADR-0069 remains Mission CQ (do not consume that number here).

## Decision

1. Implement three Layer-0 modules under `src/core/evidence/`:
   - `evidence-trail-receipt.js`: Nine-field SHA-256 sealed `CR-RCPT-*`; link/trail seal helpers; `buildChainedEvidenceTrail` fixture builder.
   - `evidence-trail-policy-gate.js`: Fail-closed verify-plan validation (planId, trailMode FIXTURE|LIVE, trail object).
   - `evidence-trail-port.js`: `govern` / `verify` / `evaluate` / `verifyTrail` / `getDecision`; append-only CL→CM→CN validation; does **not** mutate CL/CM/CN state.
2. Valid plan + trailMode:
   - `FIXTURE` + well-formed chain → PASS (design/hermetic)
   - `LIVE` + sampleOnly / dirty / UNMEASURED|BEHIND|DIVERGED → DENY
   - Missing / order / chain / cross-port / unverifiable / replay → DENY (sealed)
3. Exclude satellite test from slim; opt-in via `npm run test:mission-cr`.
4. PRODUCTION_READY=NO; Fundacion Δ=0; NO new `docs/schemas/**/*.json` (AT_CEILING 35/35).
5. Elevate Workstream D design into governed port; do **not** tip-refresh / implement CS–CU / reopen L26 in this mission.

## Alternatives REJECTED

- Treat design sample as host-live PASS — refuse (`sampleOnly` + LIVE DENY).
- SIEM / production data lake / WORM SaaS / Sigstore / GHE product claims.
- New `docs/schemas/**/*.json` (AT_CEILING 35/35) — schema inline + fixtures only.
- Mutate CL/CM/CN port state from trail verify.
- Soft-fail / soak modes — ambiguity → DENY.

## Consequences

- Positive: Sealed Evidence Trail Ritual Binding Port with PASS|DENY + chained CR receipts; ~17 hermetic tests; Fundacion Δ=0; compose Workstream D fixture.
- Negative: Local governed surface — not SIEM / data lake / production custody product.
- Invariants: PRODUCTION_READY=NO; L17–L26 never reopen; port green ≠ L27 closeout.

## NON-CLAIMS

- Evidence Trail Ritual Binding Port ≠ SIEM / ≠ production data lake / ≠ WORM SaaS / ≠ Sigstore / ≠ GHE
- ≠ auto-close L26 / ≠ new schemas JSON / ≠ Fundacion writes / PRODUCTION_READY=NO
- ≠ reopen L26 / ≠ L27 closeout / ≠ CS–CU
