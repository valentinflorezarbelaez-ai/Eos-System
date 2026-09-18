# ADR-0045 — Mission CB Cross-Ladder Composition Orchestrator Port

- **Status:** Accepted — local governed (Ladder 24 Satellite 1)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric)
- **Spec:** SPEC-0085

## Context

Ladders 11 through 23 are formally CLOSED_FOR_LOCAL_GOVERNED_USE and sealed against modification.
Ladder 22 delivered BR–BV workflow fabric; Ladder 23 delivered BW–BZ synthesis/heal/memory/merkle fabric.
Those fabrics were MEASURED in isolation — EOS lacked a Layer-0 port that composes them into one fail-closed pipeline with chained receipts.

Mission CB delivers a pure Layer-0 Cross-Ladder Composition Orchestrator Port that:
1. Accepts ordered composition plans referencing L22 and/or L23 ladder tags + known satellites (BR–BV, BW–BZ).
2. Validates plans fail-closed (empty, unknown ids, ladder mismatch, max stages, Law VI secrets, Fundacion).
3. Executes a **hermetic simulation of composition** (stub `STAGE-SEAL-<satellite>-<sha16>` seals — does not invoke full BR–BZ runtimes).
4. Chains stage digests and emits sealed `CB-RCPT-*` receipts with nine-field SHA-256 custody.
5. Verifies hash-chained custody via `verifyTrail()`.
6. Stores compositions by id; deny paths emit sealed DENIED receipts.

Ladder AS `composition-receipt.js` (AS-RCPT lineage) is **not** rewritten — CB uses new `cross-ladder-composition-*.js` files.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `cross-ladder-composition-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CB-RCPT-*`) via `node:crypto`.
   - `cross-ladder-composition-policy-gate.js`: Fail-closed plan validation.
   - `cross-ladder-composition-port.js`: Unified port facade (`compose`, `verifyTrail`, `getComposition`).
2. Hermetic stub seals only — isolation over calling full satellite runtimes.
3. Exclude satellite test suite `tests/eos-cb-cross-ladder-composition-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cb` / `test:cross-ladder-composition`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, composition ≠ Airflow/Temporal / ≠ AGI planner.

## Alternatives considered AND REJECTED

### A. Airflow / Temporal enterprise orchestrator embedding
**Rejected.** EOS does not claim DAG enterprise schedulers or durable workflow engines.
Technical reason: Local Layer-0 hermetic composition of sealed digests is sufficient for fail-closed L22×L23 chaining without external orchestrator deps.

### B. General AGI planner / autonomous multi-step agent
**Rejected.** Composition is ordered stage seal chaining with policy gates — not open-ended planning.
Technical reason: SpecBoot / cero vibe coding requires deterministic hermetic simulation with sealed receipts.

### C. Rewrite Ladder AS composition-receipt harness
**Rejected.** AS-RCPT lineage remains intact; CB ships new filenames.

## Consequences

- **Positive:** L22×L23 fail-closed composition with chained CB receipts; ≥14 hermetic tests; zero secrets; Fundacion Δ=0; AS lineage preserved.
- **Negative:** Stage seals are stubs (not live BR–BZ runtime invocations) — intentional isolation.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L23 never reopen.

## NON-CLAIMS

- Cross-ladder composition ≠ Airflow/Temporal enterprise orchestrator
- Cross-ladder composition ≠ general AGI planner
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ Fundacion writes; ≠ tip-refresh; ≠ Missions CC–CF
