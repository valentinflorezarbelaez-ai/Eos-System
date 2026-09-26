# Design — Ladder 39 Maturity Gap Audit

## 1. Architecture Overview

Ladder 39 charters the Sovereign External Event Ingress & Webhook Authenticity Governance Fabric at Layer 0 (`src/core/composition/`).

The five planned satellites address fail-closed external ingress source register/bind, webhook authenticity/signature-verify via L38 opaque credential handles (Law VI), ingress quarantine/replay-deny & ordering chained to closed L33–L38 intakes, ingress honesty / authenticity attestation beyond soft-observe (no new schema JSON; never seal secrets), and end-to-end seam consolidation. None of EY–FC is implemented in this audit package.

## 2. Satellite Ordering Rationale

1. **EY** first — without an ingress registry/binding seal, authenticity verify and quarantine have no inbound source contract to govern.
2. **EZ** next — webhook authenticity/signature-verify consumes EY source bindings and L38 opaque handles; fail-closes when plaintext webhook secrets would enter composition receipts.
3. **FA** next — ingress quarantine/replay-deny & ordering once source binding + authenticity verify exist; chains to L34 DLQ and L36 admission.
4. **FB** next — attest ingress authenticity claims honestly beyond soft-observe; hold schemas AT_CEILING; never seal secrets.
5. **FC** last — CI seam-pack consolidates EY→FB and proposes closeout readiness (tip-seal SEPARATE).

## 3. Invariants & Controls

- Node.js built-ins only (`node:crypto`). Zero external dependencies (prospective; not implemented here).
- Soft-observe freeze pin `fbd3c28a` (Formal L38 CLOSED tip-seal #531 merge; tip-refresh #532 pins freeze here / EXPECTED_TIP). Do **not** rewrite freeze `main_tip`. Do **not** tip-open Ladder 39 in this package (tip-open is SEPARATE).
- Schemas strictly held at `AT_CEILING 35/35` — Mission FB must not add `docs/schemas/**/*.json`.
- Law VI: receipts only — never seal plaintext webhook secrets into EY–FB artifacts; consume L38 opaque handles for HMAC material.
- Audit package is docs-only. `PRODUCTION_READY=NO`. Fundacion Δ=0.
- NEVER reopen L17–L38 (especially NEVER reopen L30–L38).
