# ADR-0137 — Mission ET Credential-Handle Registry & Binding Port

- **Status:** Accepted — local governed (Ladder 38 / Mission ET)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** SPEC-0156
- **Prior ADRs:** ADR-0136 (Ladder 38 Maturity Gap Audit), ADR-0135 (Mission ES L37 Closeout)

## Context

Ladder 38 is **OPEN** (tip-open #519 + tip-refresh #520 soft-observe; freeze soft-observe pin `2b747fb0`). Formal L30–L37 remain **CLOSED** — **NEVER reopen**. Mission EO–ES seal feature-flag / policy-pack / staged-activation / config-honesty / seam-pack receipts and assert Law VI (“never seal secrets”), but there is **no** Layer-0 credential-handle registry or opaque-handle binding surface under `src/core/composition/`. Existing Mission AU secret surfaces (`src/core/secrets/*`) are runtime/env-broker oriented — **not** a receipted Layer-0 composition credential-handle governance port.

This ADR accepts Mission ET as the first L38 satellite: a hermetic Credential-Handle Registry & Binding Port that seals `ET-RCPT-*` receipts with `handleDigest` over opaque handle metadata only. Tip-refresh post-ET is **SEPARATE** and must not land in this package. Law VI is absolute — refuse any input containing secret-looking fields; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `credential-handle-registry-receipt.js` — sealed `ET-RCPT-*` + freeze soft-observe `2b747fb0` + `handleHold` (`secretMaterialRefused` / `secretZeroHeld`)
   - `credential-handle-registry-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field refusal
   - `credential-handle-registry-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `CREDENTIAL_HANDLE_REGISTRY_BINDING`.
3. Binding requires opaque `handleId` + `handleClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional hermetic `observedBinding`; `authorized` must be `true` for PASS.
4. Digest field: `handleDigest` (sha256 of opaque handle metadata only — never secret bytes).
5. Fail-closed `DENY` + code `BINDING_UNAUTHORIZED` when unauthorized; `INVALID_BINDING_CLAIM` when hermetic observedBinding mismatches desiredBinding; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live secret stores, wall-clock authority, tip-refresh authority, EO/EP/AU elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L37 reopen, L38 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `2b747fb0` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests ET1–ET17; patcher `scripts/patch-mission-et.mjs`; OpenSpec `eos-ladder-38-mission-et`.

## Alternatives Considered AND REJECTED

- Elevating EO feature-flag / EP policy-pack / AU secret-runtime-broker as the ET port — REJECTED: ET is credential-handle registry bind only; fold AU concepts into semantics without reopening AU.
- Live secret stores / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedBinding only.
- Sealing plaintext secrets / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-ET is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L37 or auto-closing L38 — REJECTED (EU–EX pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L38 satellite seals fail-closed credential-handle registry binding governance with verifiable `ET-RCPT-*` receipts; EU–EW can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L37 CLOSED, L38 OPEN (Audit MEASURED; ET this; EU–EX pending), freeze pin `2b747fb0` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/EQ/ER/AU ≠ live secret store ≠ wall-clock authority.

## Links

- Audit: ADR-0136 / `docs/releases/EOS_MATURITY_LADDER_38_AUDIT_2026-09-25.md` (when present)
- Prior: ADR-0136 (L38 Audit)
- OpenSpec: `openspec/changes/eos-ladder-38-mission-et/`
