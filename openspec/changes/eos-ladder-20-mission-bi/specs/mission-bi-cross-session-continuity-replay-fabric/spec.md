# Spec — Mission BI Cross-Session Continuity & Replay Fabric (SPEC-0066)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0066 |
| Change | `openspec/changes/eos-ladder-20-mission-bi` |
| Kind | `eos-cross-session-continuity-replay-fabric` |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Facade | `src/core/continuity/cross-session-continuity-replay-fabric.js` |
| Tests | `tests/eos-bi-cross-session-continuity-replay-fabric.test.js` (BI1–BI16) |
| ADR | `docs/adrs/ADR-0025-mission-bi-cross-session-continuity-replay-fabric.md` |
| Evidence | `docs/evidence/EOS_MISSION_BI_CROSS_SESSION_CONTINUITY_EVD_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE (never reopen) |
| L20 | OPEN (BH MEASURED; BI in progress; BJ–BL pending) |
| Hermetic | in-memory fabric + sealed receipts only — no network, no CloudAgent, no real fs writes |

EARS patterns used in this spec (all four, exactly):

- Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
- State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
- Error/Unwanted: `IF <anomalous condition>, THEN THE SYSTEM SHALL <response>`
- Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`

State invariants required on every Scenario THEN/AND unless a DENY path
explicitly names a different `code`: `ok`, `code`, `receipt.sealed`,
`fundacionDelta`, `PRODUCTION_READY`.

## NON-CLAIM fence

This fabric **is not** and **shall not be advertised as**:

- an HA multi-region SaaS product
- a Raft / distributed clustering system
- PRODUCTION_READY=YES
- BJ / BK / BL missions
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

WHILE any continuity operation is in progress, THE SYSTEM SHALL keep
`haMultiRegionSaas`, `raftDistributedClustering`, `productionReadyYes`,
`cloudAgent`, and `usesCloudAgent` false, SHALL keep `notBj` / `notBk` /
`notBl` true, SHALL keep `bhMeasured` / `bhAcknowledged` true, and SHALL
keep L17/L18/L19 `CLOSED` with never-reopen markers.

## ADDED Requirements

### Requirement: Happy-path handoff with chained sealed receipts

WHEN `captureCheckpoint` then `handoffSession` succeed for distinct source
and target session ids with a verified checkpoint receipt, THE SYSTEM SHALL
return `ok: true`, `code: CAPTURE_OK` then `HANDOFF_OK`, SHALL attach sealed
receipts whose `receiptId` starts with `BI-RCPT-` and whose `receiptHash` is
a 64-character lowercase hex SHA-256 over the canonical nine-field body, and
SHALL chain `prevReceiptHash` across the handoff.

#### Scenario: Happy-path handoff (BI2)

- GIVEN a fabric and a captured checkpoint for `sess-src`
- WHEN `handoffSession` is invoked to `sess-tgt` with that checkpoint receipt
- THEN capture and handoff each have `ok: true` and codes `CAPTURE_OK` / `HANDOFF_OK`
- AND each `receipt.sealed` is `true` and `receipt.receiptId` starts with `BI-RCPT-`
- AND `receipt.receiptHash` matches `^[a-f0-9]{64}$`
- AND target receipt `prevReceiptHash` equals source capture `receiptHash`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Tampered / divergent checkpoint DENY

IF a handoff presents a checkpoint whose hash diverges from the expected or
stored hash, or whose sealed receipt fails verification, THEN THE SYSTEM
SHALL DENY with `CHECKPOINT_DIVERGENCE` or `TAMPERED_CHECKPOINT` and SHALL
seal a DENY receipt.

#### Scenario: Tampered checkpoint (BI3)

- GIVEN a captured checkpoint for `sess-tamp`
- WHEN `handoffSession` is invoked with a mutated `checkpointHash` and
  `expectCheckpointHash` set to the original
- THEN `ok` is `false` and code is `CHECKPOINT_DIVERGENCE` or `TAMPERED_CHECKPOINT`
- AND `receipt.sealed` is `true` and `receipt.status` is `DENY`
- AND `PRODUCTION_READY` is `NO` and `fundacionDelta` is `0`

### Requirement: Deterministic replay match

WHEN `replaySessionHistory` is invoked with a snapshot that re-hashes to the
sealed `checkpointHash`, THE SYSTEM SHALL return `ok: true`, `code: REPLAY_OK`,
and `replayVerified: true`.

#### Scenario: Deterministic replay (BI4)

- GIVEN a captured checkpoint with events `[a,b,c]`
- WHEN replay is invoked with the same snapshot framing
- THEN `ok` is `true` and `code` is `REPLAY_OK`
- AND `replayVerified` is `true`
- AND `receipt.handoffStatus` is `REPLAY_OK`
- AND `computedReplayHash` equals `checkpointHash`

### Requirement: Replay divergence DENY

IF replayed events / snapshot hash diverge from the sealed checkpoint hash,
THEN THE SYSTEM SHALL DENY with `code: REPLAY_DIVERGENCE` and seal a DENY
receipt with `replayVerified: false`.

#### Scenario: Replay divergence (BI5)

- GIVEN a captured checkpoint
- WHEN replay is invoked with a mutated snapshot / events
- THEN `ok` is `false` and `code` is `REPLAY_DIVERGENCE`
- AND `receipt.sealed` is `true` and `receipt.status` is `DENY`
- AND `receipt.replayVerified` is `false`

### Requirement: Composition via injectable ports

WHEN capture / handoff / replay succeed and ports `atContinuity`,
`aiMultiSession`, `wSession`, `alReplay` are supplied, THE SYSTEM SHALL
optionally call them through (happy-path composition) without importing or
rewriting AT/AI/W/AL module sources.

#### Scenario: Ports composition (BI6)

- GIVEN mock ports that record calls
- WHEN capture, handoff, and replay succeed
- THEN `atContinuity`, `aiMultiSession`, `wSession`, and `alReplay` are invoked

### Requirement: Law VI MODULE_DIR CLEAN

THE SYSTEM SHALL keep MODULE_DIR `src/core/continuity` free of contiguous
vendor-key prefix literals and free of `delivery/` / `mission/` imports,
network, and real process spawning.

#### Scenario: Law VI CLEAN (BI7)

- GIVEN MODULE_DIR `src/core/continuity`
- WHEN scanned for forbidden prefixes and hermetic violations
- THEN zero matches; filenames match `^cross-session-continuity-`

### Requirement: Governance markers

WHILE L20 is OPEN, THE SYSTEM SHALL report L17/L18/L19 CLOSED with
never-reopen markers, BH MEASURED acknowledged, BI in progress, BJ–BL
pending, and `PRODUCTION_READY=NO`.

#### Scenario: Never-reopen + BH MEASURED (BI9 / BI14)

- GIVEN a fabric instance
- WHEN `health()` is called
- THEN `l17NeverReopen` / `l18NeverReopen` / `l19NeverReopen` are `true`
- AND `bhMeasured` / `bhAcknowledged` / `biInProgress` are `true`
- AND `notBj` / `notBk` / `notBl` are `true`
- AND `ladder20` is `OPEN`

### Requirement: Fundacion ALWAYS_DENY

IF a request sets `fundacion` or `writeFundacion`, THEN THE SYSTEM SHALL
DENY with `code: FUNDACION_DENY` and `fundacionDelta: 0`.

#### Scenario: Fundacion DENY (BI10)

- GIVEN any continuity operation
- WHEN `fundacion: true` is supplied
- THEN `ok` is `false` and `code` is `FUNDACION_DENY`

### Requirement: Empty / malformed DENY

IF sessionId / missionId is empty, checkpoint is missing, handoff source
equals target, or payload is malformed, THEN THE SYSTEM SHALL DENY with the
corresponding fail-closed code and seal a DENY receipt.

#### Scenario: Empty / malformed (BI11)

- GIVEN empty sessionId on capture, missing checkpoint on handoff, same
  source/target, empty missionId, or non-array historicalEvents
- WHEN the corresponding API is invoked
- THEN DENY codes are `EMPTY_SESSION_ID` / `MISSING_CHECKPOINT` /
  `INVALID_HANDOFF` / `EMPTY_MISSION_ID` / `MALFORMED_PAYLOAD` as applicable
