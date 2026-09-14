# Spec — Mission BH Lifecycle State Machine (SPEC-0065)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0065 |
| Change | `openspec/changes/eos-ladder-20-mission-bh` |
| Kind | `eos-mission-lifecycle-state-machine` |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Facade | `src/core/mission/mission-lifecycle-state-machine.js` |
| Tests | `tests/eos-bh-mission-lifecycle-state-machine.test.js` (BH1–BH16) |
| ADR | `docs/adrs/ADR-0024-mission-bh-lifecycle-state-machine.md` |
| Evidence | `docs/evidence/EOS_MISSION_BH_LIFECYCLE_STATE_MACHINE_EVD_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE (never reopen) |
| L20 | OPEN (BH in progress; BI–BL pending) |
| Hermetic | in-memory FSM + sealed receipts only — no network, no CloudAgent, no real fs writes |

EARS patterns used in this spec (all four, exactly):

- Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
- State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
- Error/Unwanted: `IF <anomalous condition>, THEN THE SYSTEM SHALL <response>`
- Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`

State invariants required on every Scenario THEN/AND unless a DENY path
explicitly names a different `code`: `ok`, `code`, `receipt.sealed`,
`fundacionDelta`, `PRODUCTION_READY`.

## NON-CLAIM fence

This FSM **is not** and **shall not be advertised as**:

- a Jira / PM SaaS product
- a distributed consensus / multi-region system
- PRODUCTION_READY=YES
- BI / BJ / BK / BL missions
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

WHILE any transition is in progress, THE SYSTEM SHALL keep `jiraPmSaas`,
`distributedConsensus`, `multiRegion`, `productionReadyYes`, `cloudAgent`,
and `usesCloudAgent` false, SHALL keep `notBi` / `notBj` / `notBk` /
`notBl` true, and SHALL keep L17/L18/L19 `CLOSED` with never-reopen markers.

## ADDED Requirements

### Requirement: Happy-path lifecycle with chained sealed receipts

WHEN `transition` advances PROPOSED→OPEN→MEASURED→CLOSED_FOR_LOCAL_GOVERNED_USE
with a non-empty `evidenceHash` on OPEN→MEASURED, THE SYSTEM SHALL return
`ok: true`, `code: TRANSITION_OK` on each step, SHALL attach a sealed receipt
whose `receiptId` starts with `BH-RCPT-` and whose `receiptHash` is a
64-character lowercase hex SHA-256 over the canonical eight-field body, and
SHALL chain `prevReceiptHash` across the history.

#### Scenario: Happy path (BH2)

- GIVEN a state machine registered at `PROPOSED` for mission `m-happy`
- WHEN transitions PROPOSED→OPEN, OPEN→MEASURED (with `evidenceHash`), MEASURED→CLOSED_FOR_LOCAL_GOVERNED_USE are invoked in order
- THEN each result has `ok: true` and `code: TRANSITION_OK`
- AND each `receipt.sealed` is `true` and `receipt.receiptId` starts with `BH-RCPT-`
- AND `receipt.receiptHash` matches `^[a-f0-9]{64}$`
- AND `getHistory('m-happy')` length is `3` with chained `prevReceiptHash`
- AND final state is `CLOSED_FOR_LOCAL_GOVERNED_USE`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Illegal transition DENY

IF an edge is not in the allowlist (e.g. PROPOSED→MEASURED or OPEN→CLOSED),
THEN THE SYSTEM SHALL DENY with `code: ILLEGAL_TRANSITION`, SHALL NOT advance
state, and SHALL seal a DENY receipt.

#### Scenario: Illegal PROPOSED→MEASURED (BH3)

- GIVEN mission at `PROPOSED`
- WHEN `transition({ fromState: PROPOSED, toState: MEASURED })` is invoked
- THEN `ok` is `false` and `code` is `ILLEGAL_TRANSITION`
- AND `receipt.sealed` is `true` and `receipt.status` is `DENY`
- AND mission state remains `PROPOSED`
- AND `PRODUCTION_READY` is `NO` and `fundacionDelta` is `0`

#### Scenario: Illegal OPEN→CLOSED (BH4)

- GIVEN mission at `OPEN`
- WHEN `transition({ fromState: OPEN, toState: CLOSED_FOR_LOCAL_GOVERNED_USE })` is invoked
- THEN `ok` is `false` and `code` is `ILLEGAL_TRANSITION`
- AND mission state remains `OPEN`

### Requirement: Missing evidenceHash DENY

IF OPEN→MEASURED is requested without a non-empty `evidenceHash`, THEN THE
SYSTEM SHALL DENY with `code: MISSING_EVIDENCE_HASH` and seal a DENY receipt.

#### Scenario: Missing evidenceHash (BH5)

- GIVEN mission at `OPEN`
- WHEN `transition({ fromState: OPEN, toState: MEASURED })` without evidenceHash
- THEN `ok` is `false` and `code` is `MISSING_EVIDENCE_HASH`
- AND mission state remains `OPEN`

### Requirement: Tamper-resistance

WHEN a sealed receipt's canonical fields are mutated, THE SYSTEM SHALL detect
hash mismatch via `verifyTransitionReceipt`.

#### Scenario: Tamper detect (BH6)

- GIVEN a sealed OK receipt from PROPOSED→OPEN
- WHEN `toState` or `receiptHash` is mutated
- THEN `verifyTransitionReceipt` returns `ok: false`

### Requirement: Terminal CLOSED

WHILE a mission is in `CLOSED_FOR_LOCAL_GOVERNED_USE`, THE SYSTEM SHALL DENY
any leave attempt with `code: TERMINAL_CLOSED`.

#### Scenario: Terminal deny (BH10)

- GIVEN mission at `CLOSED_FOR_LOCAL_GOVERNED_USE`
- WHEN any transition leaving that state is requested
- THEN `code` is `TERMINAL_CLOSED` and state is unchanged

### Requirement: Empty / malformed DENY

IF `missionId` is empty or payload lacks required fields / uses unknown
states, THEN THE SYSTEM SHALL DENY with `EMPTY_MISSION_ID`,
`MALFORMED_PAYLOAD`, or `INVALID_STATE` and seal a receipt when possible.

#### Scenario: Empty and malformed (BH13)

- GIVEN empty `missionId` or missing `toState` or `toState: SHIPPED`
- WHEN `transition` is invoked
- THEN corresponding DENY codes are emitted with sealed receipts

### Requirement: Governance invariants

THE SYSTEM SHALL keep `PRODUCTION_READY=NO`, Fundacion Δ=0, Antigravity-first,
Law VI CLEAN on `src/core/mission` only, and L17/L18/L19 never-reopen markers.

#### Scenario: Governance health (BH1 / BH7 / BH8 / BH9)

- GIVEN a created state machine
- WHEN `health()` is inspected and MODULE_DIR is scanned
- THEN `PRODUCTION_READY` is `NO`, never-reopen markers are true, Law VI is CLEAN, NON-CLAIM flags are false

### Requirement: History and determinism

WHEN transitions complete, THE SYSTEM SHALL expose `getHistory(missionId)` of
sealed receipts (including DENY). WHEN identical inputs and clock/hash are
used, THE SYSTEM SHALL emit identical `receiptHash` values.

#### Scenario: getHistory + deterministic hash (BH11 / BH12)

- GIVEN OK then DENY transitions
- WHEN `getHistory` is called
- THEN both sealed receipts appear in order
- AND identical `buildTransitionReceipt` inputs yield identical hashes

## EARS summary (briefing + full four patterns)

- WHEN an operator requests a legal lifecycle transition with required evidence, THE SYSTEM SHALL advance state and seal a chained TransitionReceipt.
- WHEN readers inspect Mission BH health, THE SYSTEM SHALL report L20 OPEN, L17/L18/L19 CLOSED never-reopen, and Axis Sovereign Mission Continuity & Operator Fabric.
- WHILE a mission is CLOSED_FOR_LOCAL_GOVERNED_USE, THE SYSTEM SHALL refuse further transitions.
- WHILE any transition is in progress, THE SYSTEM SHALL not claim Jira/PM SaaS, distributed consensus/multi-region, or PRODUCTION_READY=YES.
- IF an illegal edge, missing evidenceHash, empty missionId, malformed payload, terminal leave, or Fundacion intent is detected, THEN THE SYSTEM SHALL DENY and emit a sealed failure receipt.
- THE SYSTEM SHALL keep PRODUCTION_READY=NO and Fundacion Δ=0 during and after lifecycle operations.
- THE SYSTEM SHALL scan Law VI only on `src/core/mission` and SHALL never reopen L17/L18/L19.
