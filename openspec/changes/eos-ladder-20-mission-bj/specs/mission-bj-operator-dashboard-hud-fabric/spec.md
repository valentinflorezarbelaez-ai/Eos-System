# Spec — Mission BJ Operator Dashboard / HUD Fabric (SPEC-0067)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0067 |
| Change | `openspec/changes/eos-ladder-20-mission-bj` |
| Kind | `eos-operator-dashboard-hud-fabric` |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Facade | `src/core/observability/operator-dashboard-hud-fabric.js` |
| Tests | `tests/eos-bj-operator-dashboard-hud-fabric.test.js` (BJ1–BJ16) |
| ADR | `docs/adrs/ADR-0026-mission-bj-operator-dashboard-hud-fabric.md` |
| Evidence | `docs/evidence/EOS_MISSION_BJ_OPERATOR_DASHBOARD_HUD_EVD_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 / L19 | CLOSED_FOR_LOCAL_GOVERNED_USE (never reopen) |
| L20 | OPEN (BH+BI MEASURED; BJ in progress; BK–BL pending) |
| Hermetic | in-memory fabric + sealed receipts only — no network, no CloudAgent, no real fs writes, no HTTP server |

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

- an observability SaaS product (Grafana / Datadog / Prometheus)
- an external web GUI / HTTP server
- PRODUCTION_READY=YES
- BK / BL missions
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

WHILE any dashboard operation is in progress, THE SYSTEM SHALL keep
`observabilitySaas`, `grafanaDatadogPrometheus`, `externalWebGui`,
`httpServer`, `productionReadyYes`, `cloudAgent`, and `usesCloudAgent`
false, SHALL keep `notBk` / `notBl` true, SHALL keep `bhMeasured` /
`biMeasured` / `bhAcknowledged` / `biAcknowledged` true, and SHALL keep
L17/L18/L19 `CLOSED` with never-reopen markers.

## ADDED Requirements

### Requirement: Happy-path snapshot with sealed receipt (Event-Driven)

WHEN `registerSurface` succeeds for freeze/matrix/evidence/replay providers
and `generateSnapshot` is invoked, THE SYSTEM SHALL return `ok: true`,
`code: SNAPSHOT_OK`, `overallHealth: OK`, SHALL attach a sealed receipt
whose `receiptId` starts with `BJ-RCPT-` and whose `receiptHash` is a
64-character lowercase hex SHA-256 over the canonical seven-field body.

#### Scenario: Happy-path snapshot (BJ2)

- GIVEN a fabric with freeze/matrix/evidence/replay providers registered OK
- WHEN `generateSnapshot` is invoked
- THEN `ok` is `true` and `code` is `SNAPSHOT_OK`
- AND `overallHealth` is `OK` and `surfaceCount` is `4`
- AND `receipt.sealed` is `true` and `receipt.receiptId` starts with `BJ-RCPT-`
- AND `receipt.receiptHash` matches `^[a-f0-9]{64}$`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Degraded on provider throw or drift (Error/Unwanted)

IF a surface provider throws or reports drift / DEGRADED health, THEN THE
SYSTEM SHALL aggregate `overallHealth: DEGRADED`, return
`code: SNAPSHOT_DEGRADED`, and SHALL seal a diagnostic receipt.

#### Scenario: Provider throw / drift (BJ3)

- GIVEN freeze OK, matrix throws, evidence reports drift, replay OK
- WHEN `generateSnapshot` is invoked
- THEN `ok` is `false` and `overallHealth` is `DEGRADED`
- AND `code` is `SNAPSHOT_DEGRADED`
- AND matrix surface health is `DEGRADED` with throw reason
- AND `receipt.sealed` is `true` and `receipt.status` is `DEGRADED`
- AND `PRODUCTION_READY` is `NO` and `fundacionDelta` is `0`

### Requirement: Receipt sealing and deterministic chaining (Ubiquitous)

THE SYSTEM SHALL seal every snapshot (OK / DEGRADED / FAIL / DENY) with
SHA-256 over the seven canonical fields, SHALL prefix `receiptId` with
`BJ-RCPT-`, and SHALL chain `prevReceiptHash` across successive snapshots.

#### Scenario: Sealing + chaining (BJ4)

- GIVEN two successive snapshots on a fabric with registered surfaces
- WHEN the second snapshot is generated with or without explicit `prevReceiptHash`
- THEN each `receiptId` starts with `BJ-RCPT-` and each `receiptHash` is 64 hex
- AND `verifyDashboardReceipt` returns `ok: true` for untampered receipts
- AND mutated `overallHealth` fails verification with tamper/mismatch reason
- AND the second receipt `prevReceiptHash` equals the first receipt hash

### Requirement: Pure text/ANSI summary (Event-Driven)

WHEN `renderTextSummary(snapshot)` is invoked with a sealed snapshot, THE
SYSTEM SHALL return a pure terminal-safe ASCII/ANSI string containing
overall health, receipt id, and per-surface lines, with no display deps.

#### Scenario: Text summary (BJ5)

- GIVEN a happy-path snapshot
- WHEN `renderTextSummary` is invoked
- THEN the result is a string matching `/EOS Operator Dashboard/` and `/BJ-RCPT-/`
- AND it includes surface ids and a `[BJ-HUD]` ASCII fallback line
- AND `renderTextSummary(null)` yields a `(no snapshot)` marker

### Requirement: Fundacion / forbidden writes DENY (Error/Unwanted)

IF a register or snapshot request sets `fundacion` or `writeFundacion`,
THEN THE SYSTEM SHALL DENY with `FUNDACION_DENY` and SHALL seal a DENY
receipt; THE SYSTEM SHALL never perform network or forbidden path writes.

#### Scenario: Fundacion DENY (BJ6)

- GIVEN a fabric
- WHEN `registerSurface` or `generateSnapshot` is invoked with Fundacion flags
- THEN `ok` is `false` and `code` is `FUNDACION_DENY`
- AND `receipt.sealed` is `true` and `fundacionDelta` is `0`
- AND BJ-owned sources contain no network/http/subprocess imports

### Requirement: Governance invariants while operating (State-Driven)

WHILE the fabric is in use, THE SYSTEM SHALL keep `PRODUCTION_READY=NO`,
L17/L18/L19 CLOSED never-reopen, L20 OPEN with BH+BI MEASURED and BJ in
progress / BK–BL pending, and NON-CLAIM flags false.

#### Scenario: Governance health (BJ1 / BJ9 / BJ13)

- GIVEN a fabric
- WHEN `health()` is invoked
- THEN `PRODUCTION_READY` is `NO` and ladder 17/18/19 are `CLOSED`
- AND `ladder20` is `OPEN` and `bjInProgress` is `true`
- AND `bhMeasured` / `biMeasured` are `true` and `notBk` / `notBl` are `true`
- AND observability SaaS / web GUI / HTTP server flags are `false`
