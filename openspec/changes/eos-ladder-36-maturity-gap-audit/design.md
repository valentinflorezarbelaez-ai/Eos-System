# Design — Ladder 36 Maturity Gap Audit

## 1. Architecture Overview

Ladder 36 charters the Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address fail-closed work-intake quotas, governed backpressure/load-shed, capacity bulkheads across process/message/temporal intakes (beyond DX fault trips and BA sandbox isolation), capacity honesty / admission attestation beyond soft-observe (no new schema JSON), and end-to-end seam consolidation. None of EJ–EN is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **EJ** first — without an admission/quota seal, backpressure and bulkheads have no intake contract to enforce.
2. **EK** next — load-shed/backpressure consumes EJ quotas without unsupervised drop of deferred/temporal work.
3. **EL** next — bulkhead isolation partitions capacity once admission + shed exist.
4. **EM** next — attest capacity/admission claims honestly beyond soft-observe; hold schemas AT_CEILING.
5. **EN** last — CI seam-pack consolidates EJ→EM and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `0903b037` (Formal L35 CLOSED tip-seal #486 merge; tip-refresh #487 pins freeze here). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 36 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission EM must not add `docs/schemas/**/*.json`.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L35 (especially NEVER reopen L30–L35).
