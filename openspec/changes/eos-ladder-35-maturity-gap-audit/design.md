 Design — Ladder 35 Maturity Gap Audit

## 1. Architecture Overview

Ladder 35 charters the Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address deadline/TTL governance on process instances, schedule wake / deferred triggers without dual-write, fail-closed timeout compensation on deadline-miss (bridging DZ compensate + EB quarantine patterns), temporal honesty / deadline attestation beyond soft-observe (no new schema JSON), and end-to-end seam consolidation. None of EE–EI is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **EE** first — without a deadline/TTL seal, schedule wake and timeout compensation have no temporal contract to enforce.
2. **EF** next — wake-at-schedule consumes L33 messaging + EE deadlines without unsupervised polling.
3. **EG** next — deadline-miss must compensate/quarantine fail-closed once EE+EF exist.
4. **EH** next — attest temporal claims honestly beyond soft-observe; hold schemas AT_CEILING.
5. **EI** last — CI seam-pack consolidates EE→EH and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `1153a289` (Formal L34 CLOSED tip-seal #471 merge; tip-refresh #472 pins freeze here). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 35 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission EH must not add `docs/schemas/**/*.json`.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L34 (especially NEVER reopen L30–L34).
