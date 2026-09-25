# Proposal — Mission EM Capacity Honesty & Admission Attestation (SPEC-0149)

## Why

After L36 OPEN + Audit MEASURED (ADR-0124) + EJ MEASURED (#491) + tip-refresh #492 + EK MEASURED (#493) + tip-refresh #494 + EL MEASURED (#495) + tip-refresh #496 (`933f32ae`), Ladder 36 needs its fourth satellite: a Layer-0 port that attests capacity/admission honesty into `EM-RCPT-*` receipts — without live metrics scrapers, wall-clock capacity authority, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L35, auto-closing L36, or Fundacion writes. Soft-observe of freeze pins alone is **not** capacity truth (mirror EH vs soft-observe for temporal). Mission EJ seals intake quotas; EK seals load-shed; EL seals bulkheads; EH seals temporal honesty — none attests capacity/admission claim honesty.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `capacity-honesty-attestation-receipt.js` — sealed `EM-RCPT-*` + freeze soft-observe `933f32ae` + attestationHold
  - `capacity-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
  - `capacity-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-em-capacity-honesty-attestation.test.js` (EM1–EM17)
- CRLF-safe surgical patcher `scripts/patch-mission-em.mjs`
- OpenSpec change, ADR-0128

## Non-goals

- Live metrics scrapers / wall-clock capacity authority; treating soft-observe as capacity truth; EJ/EK/EL/EH extension; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L36 auto-close; L30–L35 reopen; tip-refresh; CloudAgent; mass prune

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L35 | CLOSED — NEVER reopen |
| L36 | OPEN (Audit+EJ+EK+EL MEASURED · EM this · EN pending) |
| Axis | Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric |
| Freeze pin | `933f32ae` (EL #495 merge / tip-refresh #496; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed capacity/admission honesty attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ live metrics ≠ EJ/EK/EL/EH |
| Tip-refresh | NOT this package (SEPARATE next) |
