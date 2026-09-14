# ADR-0025 — Mission BI Cross-Session Continuity & Replay Fabric

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Mission Continuity & Operator Fabric)
- **Spec:** SPEC-0066

## Context

Ladder 20 audit (ADR-0023) ordered BH→BL under axis **Sovereign Mission
Continuity & Operator Fabric**. L17/L18/L19 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L20 is OPEN
(BH MEASURED; BI in progress; BJ–BL pending).

Mission BH shipped the Mission Lifecycle State Machine (SPEC-0065 /
ADR-0024). Mission BI needs a typed, hermetic **Cross-Session Continuity &
Replay Fabric** that custodies session checkpoints, cross-session handoffs,
and deterministic replay with sealed continuity receipts
(stableStringify + sha256 via node:crypto), fail-closed policy gate, and
injectable AT/AI/W/AL ports — without claiming HA multi-region SaaS,
Raft/distributed clustering, or PRODUCTION_READY=YES.

Base tip (expected): `82cbb86d3902f8637ace2f830e383cbb36a94f00`
(StartsWith `82cbb86`; post-#288 tip · BH MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under `src/core/continuity/` (NOT `mission/`
   or `delivery/`):
   - `cross-session-continuity-receipt.js` — sealed `BI-RCPT-*` receipts
   - `cross-session-continuity-policy-gate.js` — schema / integrity /
     handoff / Fundacion / malformed DENY
   - `cross-session-continuity-replay-fabric.js` — facade
     (`createCrossSessionContinuityReplayFabric`, `captureCheckpoint`,
     `handoffSession`, `replaySessionHistory`)
2. Compose AT/AI/W/AL via injectable ports/stubs ONLY — do not rewrite or
   vendor-copy their sources.
3. Seal every outcome (OK and DENY) with canonical nine-field SHA-256 body;
   chain `prevReceiptHash`.
4. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on MODULE_DIR `src/core/continuity` only.
5. Exclude hermetic BI tests from SLIM (≤145) via CRLF-safe patcher.

## Alternatives considered AND REJECTED

### A. Distributed Raft cluster for session continuity

**Rejected.** A Raft/Paxos-style replicated session log would claim
distributed clustering completeness and host-stateful network dependencies —
exactly the NON-CLAIM fence (`raftDistributedClustering=false`). In-memory
hermetic fabric already proves cross-session custody for local governed use.
Technical reason: Raft clustering is out of axis scope and would break
hermetic `node --test` / Antigravity-first.

### B. Unvalidated ephemeral memory handoff

**Rejected.** Passing raw session state between sessions without checkpoint
hash verification or sealed receipts would soft-allow broken continuity and
checkpoint divergence — violating fail-closed custody. Technical reason:
DENY + sealed failure receipt is the only honest outcome for missing /
divergent / tampered checkpoints.

### C. Generic external Redis/DB session store

**Rejected.** Binding continuity to Redis/Postgres/etc. would claim HA
multi-region SaaS product completeness, require network/credentials, and
break hermetic tests. Technical reason: NON-CLAIM `haMultiRegionSaas=false`;
fabric is local in-memory custody, not a hosted session store.

## Consequences

- Payload ships ADR-0025 + evidence + OpenSpec (epistemic parity with BH).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bi`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention; prefer measured 914/0 pattern).
- BJ–BL remain pending; L17/L18/L19 stay CLOSED forever relative to this ladder.
- BH remains MEASURED (acknowledged); PRODUCTION_READY stays NO.

## NON-CLAIM

- ≠ HA multi-region SaaS
- ≠ Raft / distributed clustering
- ≠ PRODUCTION_READY=YES
- ≠ reopening L17 / L18 / L19
- ≠ BJ–BL implementation in this change
