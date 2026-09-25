# ADR-0115 — Mission EB Dead-Letter Quarantine & Poison-Message Governance Port

- **Status:** Accepted — local governed (Ladder 34 Mission EB / SPEC-0138)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric)
- **Spec:** SPEC-0138 (Mission EB)
- **Prior ADRs:** ADR-0114 (Mission EA CQRS Read-Model Projection), ADR-0113 (Mission DZ Process Manager / Saga), ADR-0112 (Ladder 34 Maturity Gap Audit)

## Context

Ladder 34 is **OPEN** (Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending) after tip-refresh #464 (freeze soft-observe pin `037f9578` — EA merge). Ladders 30–33 remain formally **CLOSED** — **NEVER reopen L30–L33**.

After Mission EA sealed CQRS read-model projection integrity, dead-letter / poison-message governance must advance: messages that exhaust idempotent consumption or circuit-breaker fallback must be quarantined fail-closed with governed poison-message disposition. Silent drop and unsupervised retry are forbidden. A Layer-0 dead-letter quarantine port seals `EB-RCPT-*` receipts with hermetic in-memory disposition (not a live broker write).

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EB (SPEC-0138) as a Pure Layer-0 triad under `src/core/composition/`:
   - `dead-letter-quarantine-receipt.js` — sealed `EB-RCPT-*` + freeze soft-observe `037f9578` + quarantineHold
   - `dead-letter-quarantine-policy-gate.js` — fail-closed govern preconditions
   - `dead-letter-quarantine-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `quarantine` `{ messageId, poisonReason, sourceConsumer, attemptCount, payloadDigest?, disposition? }`.
3. Soft-observe freeze pinShort `037f9578` with `tipRewriteRefused`, `l34AutoCloseRefused`, `silentDropRefused`, `unsupervisedRetryRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing messageId/poisonReason/sourceConsumer/attemptCount, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, silent-drop claim, unsupervised-retry claim, reopen L30–L33, L34 auto-close, GHE claims, network write, live-broker write, auto-seal without human gate.
5. **HOLD** / **PASS** emit `quarantineDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. Disposition path: **PASS** with `disposition` seals hermetic in-memory quarantine receipt — **not a live broker**.
7. **PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop**.
8. Node built-ins only (`node:crypto`). No new schema JSON. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending) |
| Freeze pin | `037f9578` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed quarantine ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Silent drop of poison messages — REJECTED: fail-closed quarantine with EB-RCPT-* receipt is mandatory.
- Unsupervised / unbounded retry — REJECTED: exhausted messages must enter governed quarantine.
- Live broker write from this port — REJECTED: disposition seals hermetic in-memory quarantine receipt only.
- Network / remote quarantine dispatch — REJECTED: PASS ≠ network write; hermetic in-memory only.
- Adding `docs/schemas/**/*.json` for quarantine contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L33 or auto-closing L34 — REJECTED: L30–L33 NEVER reopen; L34 auto-close refused (EB–ED pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EB is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Third Ladder 34 satellite seals dead-letter / poison-message quarantine without silent drop or unsupervised retry, with hermetic in-memory disposition receipts.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L33 CLOSED, freeze pin `037f9578` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EC (Event Compatibility Gate), ED (L34 Seam-Pack Closeout). Tip-refresh post-EB is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-34-mission-eb/`
- Tests: `tests/eos-eb-dead-letter-quarantine-port.test.js` (EB1–EB17)
- Patcher: `scripts/patch-mission-eb.mjs`
- Prior: ADR-0114 (Mission EA), ADR-0113 (Mission DZ), ADR-0112 (L34 Audit)
