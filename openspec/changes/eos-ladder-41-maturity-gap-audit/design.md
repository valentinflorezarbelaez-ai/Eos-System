# Design — Ladder 41 Maturity Gap Audit

## 1. Architecture Overview

Ladder 41 charters the Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address fail-closed bidirectional delivery correlation registry/binding (opaque L39 ingress refs ↔ L40 outbound delivery refs), round-trip / request-reply integrity governance (Law VI; never seal secrets), bidirectional mismatch quarantine/deny chained to closed L33–L40 intakes, bidirectional delivery honesty / integrity attestation beyond soft-observe (no new schema JSON; never seal secrets), and end-to-end seam consolidation. None of FI–FM is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **FI** first — without a correlation registry/binding seal, integrity verify and mismatch quarantine have no cross-fabric contract to govern.
2. **FJ** next — round-trip / request-reply integrity consumes FI correlation bindings and opaque L39/L40 refs; fail-closes when plaintext secrets or raw payloads would enter composition receipts.
3. **FK** next — bidirectional mismatch quarantine/deny once correlation binding + integrity verify exist; chains to L34 DLQ, L35 temporal, L36 admission, L39 ingress quarantine, and L40 outbound quarantine.
4. **FL** next — attest bidirectional integrity claims honestly beyond soft-observe; hold schemas AT_CEILING; never seal secrets.
5. **FM** last — CI seam-pack consolidates FI→FL and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `77fd2785` (Formal L40 CLOSED tip-seal #561 merge; tip-refresh #562 pins freeze here / EXPECTED_TIP). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 41 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission FL must not add `docs/schemas/**/*.json`.
- Law VI: receipts only — never seal plaintext callback secrets or raw correlation payloads into FI–FL artifacts; consume L38 opaque handles + opaque L39/L40 refs.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L40 (especially NEVER reopen L30–L40).
