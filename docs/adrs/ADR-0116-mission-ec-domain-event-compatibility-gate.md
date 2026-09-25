# ADR-0116 — Mission EC Domain Event Compatibility & Evolution Gate Port

- **Status:** Accepted — local governed (Ladder 34 Mission EC / SPEC-0139)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Process Orchestration, CQRS Projection & Domain-Event Evolution Fabric)
- **Spec:** SPEC-0139 (Mission EC)
- **Prior ADRs:** ADR-0115 (Mission EB Dead-Letter Quarantine), ADR-0114 (Mission EA CQRS Read-Model Projection), ADR-0113 (Mission DZ Process Manager / Saga), ADR-0112 (Ladder 34 Maturity Gap Audit)

## Context

Ladder 34 is **OPEN** (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending) after tip-refresh #466 (freeze soft-observe pin `19b353d8` — EB merge). Ladders 30–33 remain formally **CLOSED** — **NEVER reopen L30–L33**.

After Mission EB sealed dead-letter / poison-message quarantine, domain-event compatibility / evolution must advance: event evolution must be gated without adding schema JSON files. A Layer-0 compatibility and evolution gate port records allow/deny receipts (`EC-RCPT-*`) against existing event contracts only. BREAKING and RENAME_FORBIDDEN seal DENY; COMPATIBLE and ADD_OPTIONAL_FIELD may PASS hermetically.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EC (SPEC-0139) as a Pure Layer-0 triad under `src/core/composition/`:
   - `domain-event-compatibility-receipt.js` — sealed `EC-RCPT-*` + freeze soft-observe `19b353d8` + compatibilityHold
   - `domain-event-compatibility-policy-gate.js` — fail-closed govern preconditions
   - `domain-event-compatibility-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `evolution` `{ eventType, fromVersion?, toVersion?, changeKind (ADD_OPTIONAL_FIELD|RENAME_FORBIDDEN|BREAKING|COMPATIBLE), contractDigest? }`.
3. Soft-observe freeze pinShort `19b353d8` with `tipRewriteRefused`, `l34AutoCloseRefused`, `schemaJsonAddRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing eventType/changeKind, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, BREAKING / RENAME_FORBIDDEN, breaking-without-deny misuse, reopen L30–L33, L34 auto-close, GHE claims, network write, auto-seal without human gate.
5. **HOLD** / **PASS** emit `compatibilityDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **PASS** only for `COMPATIBLE` / `ADD_OPTIONAL_FIELD` hermetic receipts — **not** a new schema JSON file.
7. **PASS ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY**.
8. Node built-ins only (`node:crypto`). No new schema JSON. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending) |
| Freeze pin | `19b353d8` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed compatibility ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Adding `docs/schemas/**/*.json` for event evolution contracts — REJECTED: schemas AT_CEILING 35/35; gate against existing contracts only.
- Allowing BREAKING / RENAME_FORBIDDEN as PASS — REJECTED: sealed DENY receipt is mandatory.
- Force-allow breaking without deny path — REJECTED: breaking-without-deny misuse refused.
- Network / remote compatibility dispatch — REJECTED: PASS ≠ network write; hermetic in-memory only.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L33 or auto-closing L34 — REJECTED: L30–L33 NEVER reopen; L34 auto-close refused (EC–ED pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EC is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Fourth Ladder 34 satellite seals domain-event compatibility / evolution without new schema JSON, with hermetic allow/deny receipts against existing event contracts.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L33 CLOSED, freeze pin `19b353d8` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission ED (L34 Seam-Pack Closeout). Tip-refresh post-EC is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-34-mission-ec/`
- Tests: `tests/eos-ec-domain-event-compatibility-port.test.js` (EC1–EC17)
- Patcher: `scripts/patch-mission-ec.mjs`
- Prior: ADR-0115 (Mission EB), ADR-0114 (Mission EA), ADR-0113 (Mission DZ), ADR-0112 (L34 Audit)
