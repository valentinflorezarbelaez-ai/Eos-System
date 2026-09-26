# Design — Ladder 40 Maturity Gap Audit

## 1. Architecture Overview

Ladder 40 charters the Sovereign Outbound Delivery & Callback Authenticity Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address fail-closed outbound delivery / callback target register/bind, outbound callback authenticity/signature-sign via L38 opaque credential handles (Law VI; symmetric to L39 EZ inbound verify), outbound delivery quarantine/retry-deny & ack chained to closed L33–L39 intakes, outbound delivery honesty / receipt attestation beyond soft-observe (no new schema JSON; never seal secrets), and end-to-end seam consolidation. None of FD–FH is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **FD** first — without an outbound target registry/binding seal, authenticity sign and quarantine have no egress destination contract to govern.
2. **FE** next — outbound callback authenticity/signature-sign consumes FD target bindings and L38 opaque handles; fail-closes when plaintext callback secrets would enter composition receipts; mirrors L39 EZ verify on the outbound path.
3. **FF** next — outbound delivery quarantine/retry-deny & ack once target binding + authenticity sign exist; chains to L34 DLQ, L35 temporal, and L36 admission.
4. **FG** next — attest outbound delivery authenticity claims honestly beyond soft-observe; hold schemas AT_CEILING; never seal secrets.
5. **FH** last — CI seam-pack consolidates FD→FG and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `b3ce343d` (Formal L39 CLOSED tip-seal #546 merge; tip-refresh #547 pins freeze here / EXPECTED_TIP). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 40 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission FG must not add `docs/schemas/**/*.json`.
- Law VI: receipts only — never seal plaintext callback secrets into FD–FG artifacts; consume L38 opaque handles for HMAC material.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L39 (especially NEVER reopen L30–L39).
