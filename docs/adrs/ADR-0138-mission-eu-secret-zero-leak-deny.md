# ADR-0138 — Mission EU Secret-Zero Leak-Deny & Redaction Governance Port

- **Status:** Accepted — local governed (Ladder 38 / Mission EU)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** SPEC-0157
- **Prior ADRs:** ADR-0136 (Ladder 38 Maturity Gap Audit), ADR-0137 (Mission ET Credential-Handle Registry)

## Context

Ladder 38 is **OPEN** (Audit MEASURED · ET MEASURED · EU this · EV–EX pending). Soft-observe freeze pin is `bc24c17b` (ET #521 / current EXPECTED_TIP after tip-refresh #522). Formal L30–L37 remain **CLOSED** — **NEVER reopen**. Mission ET sealed opaque credential-handle binding receipts (`ET-RCPT-*`) under `src/core/composition/`, but composition still lacks a fail-closed **secret-zero leak-deny / redaction** port that refuses plaintext secret-looking material from entering composition receipts, logs, or federation-shaped bodies. Mission AU `src/core/secrets/secret-leak-guard.js` is runtime/env oriented — **not** a receipted Layer-0 composition leak-deny port. Tip-refresh post-EU is **SEPARATE**. Law VI is absolute — never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `secret-zero-leak-deny-receipt.js` — sealed `EU-RCPT-*` + freeze soft-observe `bc24c17b` + `leakHold` (`secretMaterialRefused` / `secretZeroHeld`)
   - `secret-zero-leak-deny-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field / secret-payload refusal
   - `secret-zero-leak-deny-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `SECRET_ZERO_LEAK_DENY_REDACTION`.
3. Claim requires `subjectKind` (`RECEIPT|LOG|FEDERATION_BODY|COMPOSITE`) + `desiredAction` (`DENY_LEAK|REDACT|HOLD`); optional hermetic `observedScan.leakDetected` (boolean only — no secret payload); `authorized` must be `true` for PASS.
4. Digest field: `redactionDigest` (sha256 of hermetic redaction claim metadata only — never secret bytes).
5. Fail-closed `DENY` + code `REDACTION_UNAUTHORIZED` when unauthorized; `INVALID_REDACTION_CLAIM` when `DENY_LEAK|REDACT` with `leakDetected===false`; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `SECRET_PAYLOAD_IN_SCAN_FORBIDDEN` / `RAW_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live secret stores, wall-clock authority, tip-refresh authority, EO/EP/ET/AU elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L37 reopen, L38 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `bc24c17b` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EU1–EU17; patcher `scripts/patch-mission-eu.mjs`; OpenSpec `eos-ladder-38-mission-eu`.

## Alternatives Considered AND REJECTED

- Elevating ET credential-handle registry / AU secret-leak-guard as the EU port — REJECTED: EU is leak-deny / redaction only; fold AU concepts into semantics without reopening AU; ET is bind ≠ leak-deny.
- Live secret stores / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedScan only.
- Sealing plaintext secrets / secret-looking fields / secret payloads into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EU is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L37 or auto-closing L38 — REJECTED (EV–EX pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L38 satellite seals fail-closed secret-zero leak-deny / redaction governance with verifiable `EU-RCPT-*` receipts; EV–EW can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L37 CLOSED, L38 OPEN (Audit MEASURED; ET MEASURED; EU this; EV–EX pending), freeze pin `bc24c17b` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/EQ/ER/ET/AU ≠ live secret store ≠ wall-clock authority.

## Links

- Audit: ADR-0136
- Prior: ADR-0137 (Mission ET)
- OpenSpec: `openspec/changes/eos-ladder-38-mission-eu/`
