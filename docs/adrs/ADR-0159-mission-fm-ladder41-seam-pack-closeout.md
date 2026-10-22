# ADR-0159 — Mission FM Ladder 41 CI Seam-Pack Consolidation & Closeout

- **Status:** Proposed — pending PO review of the spec delta (Ladder 41 / Mission FM)
- **Date:** 2026-10-22 (America/Bogota)
- **Deciders:** Product Owner authorization (EOS local governed use)
- **Spec:** SPEC-0175
- **Prior ADRs:** ADR-0158 (Mission FL honesty attestation), ADR-0157 (Mission FK mismatch quarantine), ADR-0156 (Mission FJ round-trip integrity), ADR-0155 (Mission FI correlation registry), ADR-0154 (Ladder 41 Maturity Gap Audit)

## Context

Ladder 41 is **OPEN** with all four satellites MEASURED: FI (#566), FJ (#577), FK (#578), FL (#581). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. The four ports and four receipt families (`FI-RCPT-*`, `FJ-RCPT-*`, `FK-RCPT-*`, `FL-RCPT-*`) exist independently, but there is **no** end-to-end chaining proof and **no** consolidated seam-pack for Ladder 41 — whereas L37–L40 each closed with an equivalent seam-pack (ES, EX, FC, FH).

This ADR proposes FM as that consolidation satellite. It explicitly does **not** tip-seal, does not close L41, and does not rewrite freeze pins.

## Decision

1. Add a Layer-0 triad under `src/core/composition/`:
   - `ladder41-seam-receipt.js` — sealed `FM-RCPT-*` + opaque `seamDigest` + freeze soft-observe `f5948926`
   - `ladder41-seam-policy-gate.js` — fail-closed seam/closeout preconditions + Law VI refusal
   - `ladder41-seam-port.js` — `Ladder41SeamPort` (`seam`, `verifyTrail`) + `softObserveFi/Fj/Fk/Fl`
2. Operation name: `LADDER_41_SEAM_PACK_CONSOLIDATION`.
3. Satellites are **soft-observed**, never hard-required: absence yields `present: false` and never throws (slim checkouts must stay green).
4. L41 closeout requires `humanGateHeld`; otherwise DENY `L41_AUTO_CLOSE_FORBIDDEN`.
5. **Tip-seal inside the product package is refused** (`TIP_SEAL_IN_PRODUCT_FORBIDDEN`). Formal L41 CLOSED remains a SEPARATE governed act after the FM merge and its tip-refresh.
6. Digest field: `seamDigest` over chain booleans, chain labels, satellite spec ordinals and seam class only — never ids, payloads or secrets.
7. Refuse Fundacion writes, secret-looking fields, secret tokens, hard delete, mass prune, PRODUCTION_READY flip, L30–L40 reopen, tip rewrite, schema-json add, network write, GHE claims, live HTTP egress, wall-clock authority, satellite-as-seam elevation, auto-seal without human gate.
8. Hermetic suite FM1–FM17; OpenSpec `eos-ladder-41-mission-fm`; slim-exclude to hold TR-01 ≤ 145.
9. Mirror Mission FH (`ladder40-seam-*`) and Mission FC (`ladder39-seam-*`) structure exactly, so L41 closure is auditable against its predecessors.

## Alternatives Considered AND REJECTED

- Closing L41 directly from FM without a separate tip-seal — REJECTED: every prior ladder separates product from seal; folding them would let a product PR change the freeze pin.
- Making FI/FJ/FK/FL hard dependencies of the seam suite — REJECTED: breaks slim discovery and TR-01 ≤ 145.
- Elevating any single satellite as the seam port — REJECTED: the seam consolidates; it does not replace.
- Auto-closing L41 on a complete chain without a human gate — REJECTED: closure is a governed act, not a computed side effect.
- Adding schema JSON or rewriting the freeze pin in this package — REJECTED: AT_CEILING 35/35, tip-refresh SEPARATE.

## Consequences (if accepted)

- Positive: L41 becomes end-to-end auditable in one hermetic suite with a `FM-RCPT-*` seam receipt; the subsequent tip-seal can close the ladder on measured evidence.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN until tip-seal, schemas AT_CEILING 35/35.
- Non-claims: FM package ≠ tip-seal ≠ Formal L41 CLOSED ≠ PRODUCTION_READY ≠ GHE.

## Links

- Blocking dependency: PR #581 (Mission FL / ADR-0158) merge `f5948926` + tip-refresh post-#581 `fa153c33`
- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- Precedent: ADR-0153 (FH / L40 seam-pack), ADR-0147 (FC / L39 seam-pack)
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fm/`
