# Design — Ladder 38 Maturity Gap Audit

## 1. Architecture Overview

Ladder 38 charters the Sovereign Credential-Handle & Secret-Zero Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address fail-closed opaque credential-handle register/bind, composition secret-zero leak-deny/redaction, staged handle lifecycle/rotation chained to closed L33–L37 intakes, credential honesty / handle attestation beyond soft-observe (no new schema JSON; never seal secrets), and end-to-end seam consolidation. None of ET–EX is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **ET** first — without a credential-handle registry/binding seal, leak-deny and rotation have no opaque handle contract to govern.
2. **EU** next — secret-zero leak-deny/redaction consumes ET handles and fail-closes when plaintext secrets would enter composition receipts/logs.
3. **EV** next — staged handle rotate/revoke lifecycle seals once handle binding + leak-deny exist; chains to L37 EQ staged activation.
4. **EW** next — attest handle/secret-zero claims honestly beyond soft-observe; hold schemas AT_CEILING; never seal secrets.
5. **EX** last — CI seam-pack consolidates ET→EW and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `6868856c` (Formal L37 CLOSED tip-seal #516 merge; tip-refresh #517 pins freeze here / EXPECTED_TIP). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 38 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission EW must not add `docs/schemas/**/*.json`.
- Law VI: receipts only — never seal plaintext secrets into ET–EW artifacts.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L37 (especially NEVER reopen L30–L37).
