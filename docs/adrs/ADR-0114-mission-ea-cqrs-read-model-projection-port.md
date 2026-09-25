# ADR-0114 — Mission EA CQRS Read-Model Projection Port

- **Status:** Accepted — local governed (Ladder 34 Mission EA / SPEC-0137)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric)
- **Spec:** SPEC-0137 (Mission EA)
- **Prior ADRs:** ADR-0113 (Mission DZ Process Manager / Saga), ADR-0112 (Ladder 34 Maturity Gap Audit), ADR-0107 (Mission DU Domain Event Publisher)

## Context

Ladder 34 is **OPEN** (Audit MEASURED · DZ MEASURED · EA–ED pending) after tip-refresh #462 (freeze soft-observe pin `1f2234cf` — DZ merge). Ladders 30–33 remain formally **CLOSED** — **NEVER reopen L30–L33**.

After Mission DZ sealed multi-step process / saga orchestration, CQRS read-model projection integrity must advance: query models derived from domain events must be rebuildable from the event stream. Projections stay disposable and reconstructable — **not a second source of truth**. A Layer-0 CQRS read-model projection port seals `EA-RCPT-*` receipts with hermetic in-memory rebuild path.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EA (SPEC-0137) as a Pure Layer-0 triad under `src/core/composition/`:
   - `cqrs-read-model-projection-receipt.js` — sealed `EA-RCPT-*` + freeze soft-observe `1f2234cf` + projectionHold
   - `cqrs-read-model-projection-policy-gate.js` — fail-closed govern preconditions
   - `cqrs-read-model-projection-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `projection` `{ projectionId, projectionType, sourceEvent { eventType, aggregateId, payload }, rebuildFromStream?, checkpoint? }`.
3. Soft-observe freeze pinShort `1f2234cf` with `tipRewriteRefused`, `l34AutoCloseRefused`, `secondSourceOfTruthRefused`, `dualWriteRefused`, `schemasAtCeiling: true`, `projectionDisposable: true`.
4. Policy **DENY** on: missing projection/sourceEvent, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, treating projection as SoT / dual-write claim, reopen L30–L33, L34 auto-close, GHE claims, network write, live-DB rebuild, auto-seal without human gate.
5. **HOLD** / **PASS** emit `projectionDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. Rebuild path: **PASS** with `rebuildFromStream: true` seals rebuild receipt (hermetic in-memory) — **not a live DB**.
7. **PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT**.
8. Node built-ins only (`node:crypto`). No new schema JSON. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ MEASURED · EA–ED pending) |
| Freeze pin | `1f2234cf` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed projection ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Treating projection as a second source of truth — REJECTED: projections are disposable and reconstructable from the event stream.
- Dual-write (events + projection as co-authoritative) — REJECTED: reintroduces dual-write chaos; event stream remains SoT.
- Live DB rebuild from this port — REJECTED: rebuildFromStream seals hermetic in-memory rebuild receipt only.
- Network / remote projection dispatch — REJECTED: PASS ≠ network write; hermetic in-memory only.
- Adding `docs/schemas/**/*.json` for projection contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L33 or auto-closing L34 — REJECTED: L30–L33 NEVER reopen; L34 auto-close refused (EA–ED pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EA is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Second Ladder 34 satellite seals CQRS read-model projection apply/rebuild without treating projections as SoT, with hermetic in-memory rebuild receipts.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L33 CLOSED, freeze pin `1f2234cf` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EB (Dead-Letter Quarantine), EC (Event Compatibility Gate), ED (L34 Seam-Pack Closeout). Tip-refresh post-EA is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-34-mission-ea/`
- Tests: `tests/eos-ea-cqrs-read-model-projection-port.test.js` (EA1–EA17)
- Patcher: `scripts/patch-mission-ea.mjs`
- Prior: ADR-0113 (Mission DZ), ADR-0112 (L34 Audit)