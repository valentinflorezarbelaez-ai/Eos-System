# ADR-0024 — Mission BH Lifecycle State Machine

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Mission Continuity & Operator Fabric)
- **Spec:** SPEC-0065

## Context

Ladder 20 audit (ADR-0023) ordered BH→BL under axis **Sovereign Mission
Continuity & Operator Fabric**. L17/L18/L19 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L20 is OPEN
(audit MEASURED; BH in progress; BI–BL pending).

Mission BH needs a typed, hermetic **Mission Lifecycle State Machine** that
custodies PROPOSED → OPEN → MEASURED → CLOSED_FOR_LOCAL_GOVERNED_USE with
sealed TransitionReceipts (stableStringify + sha256 via node:crypto),
fail-closed policy gate, and in-memory history — without claiming Jira/PM
SaaS, distributed consensus/multi-region, or PRODUCTION_READY=YES.

Base tip (expected): `e2e78a38be3a92e8c209c8dbe4814d575544b5ce`
(StartsWith `e2e78a3`; post-#286 tip · L20 audit MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under `src/core/mission/` (NOT `delivery/`):
   - `mission-transition-receipt.js` — sealed `BH-RCPT-*` receipts
   - `mission-lifecycle-policy-gate.js` — illegal / missing evidence /
     terminal / malformed / empty missionId DENY
   - `mission-lifecycle-state-machine.js` — pure FSM facade
     (`createMissionLifecycleStateMachine`, `transition`, `getHistory`)
2. Enforce allowlisted edges only; OPEN→MEASURED requires non-empty
   `evidenceHash`; CLOSED_FOR_LOCAL_GOVERNED_USE is terminal.
3. Seal every outcome (OK and DENY) with canonical eight-field SHA-256 body;
   chain `prevReceiptHash`.
4. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on MODULE_DIR `src/core/mission` only.
5. Exclude hermetic BH tests from SLIM (≤145) via CRLF-safe patcher.

## Alternatives considered AND REJECTED

### A. Embed lifecycle FSM inside `src/core/delivery/`

**Rejected.** Delivery fabric (BC–BG) is L19 CLOSED. Putting mission
continuity under `delivery/` would blur axes, risk rewriting sealed delivery
ports, and violate Layer-0 separation (mission continuity ≠ delivery
verification). Technical reason: L20 axis is Sovereign Mission Continuity &
Operator Fabric; modules belong under `src/core/mission/`.

### B. Soft-allow illegal transitions / skip evidenceHash

**Rejected.** Soft-allowing PROPOSED→MEASURED or OPEN→CLOSED, or advancing
OPEN→MEASURED without evidence, would break fail-closed custody and make
CLOSED_FOR_LOCAL_GOVERNED_USE meaningless. Technical reason: DENY + sealed
failure receipt is the only honest outcome for illegal/missing-evidence paths.

### C. Distributed consensus / multi-region mission store

**Rejected.** A Raft/Paxos or multi-region replicated mission ledger would
claim distributed consensus completeness and host-stateful network
dependencies — exactly the NON-CLAIM fence (`distributedConsensus=false`,
`multiRegion=false`). In-memory hermetic FSM already proves lifecycle custody
for local governed use.

### D. Jira/PM SaaS integration as product surface

**Rejected.** Binding transitions to Jira/Linear/Asana APIs would claim PM
SaaS product completeness, require network/credentials, and break hermetic
`node --test`. Technical reason: NON-CLAIM `jiraPmSaas=false`; FSM is local
custody, not a project tracker.

## Consequences

- Payload ships ADR-0024 + evidence + OpenSpec (epistemic parity with BE/BF).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bh`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention; prefer measured 914/0 pattern).
- BI–BL remain pending; L17/L18/L19 stay CLOSED forever relative to this ladder.
- PRODUCTION_READY stays NO.

## NON-CLAIM

- ≠ Jira/PM SaaS
- ≠ distributed consensus / multi-region
- ≠ PRODUCTION_READY=YES
- ≠ reopening L17 / L18 / L19
- ≠ BI–BL implementation in this change
