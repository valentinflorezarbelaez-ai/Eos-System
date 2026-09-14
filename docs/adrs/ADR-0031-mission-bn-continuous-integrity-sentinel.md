# ADR-0031 — Mission BN Continuous Integrity Sentinel & FDIR Heartbeat Daemon

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric)
- **Spec:** SPEC-0071

## Context

Ladder 21 audit (ADR-0029) ordered BM→BQ under axis **Sovereign Multi-Agent
Provenance & Continuous Sentinel Fabric**. L17/L18/L19/L20 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L21 is OPEN
(BM MEASURED; BN in progress; BO–BQ pending).

Mission R shipped FDIR sentinel runtime. AV shipped freeze-drift observer.
AZ shipped self-repair FDIR bridge. BM shipped agent identity attestation
(MEASURED). Mission BN needs a typed, hermetic **Continuous Integrity
Sentinel & FDIR Heartbeat Daemon** that pulses integrity checks, seals
BN-RCPT-* receipts, and quarantines drift — without claiming
Datadog/Prometheus/K8s daemonset, heavy APM, or PRODUCTION_READY=YES
monitoring product. Sibling dirs `freeze-drift/`, `fdir/`, and
`governance/` already exist and MUST NOT be rewritten; BN lives in NEW
`src/core/sentinel/` and composes siblings via optional injectable ports.

Base tip (expected): `5c9ec4db9165070e911b6121caba497d968d6050`
(StartsWith `5c9ec4d`; tip post-#300 / BM MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under NEW `src/core/sentinel/`:
   - `sentinel-heartbeat-receipt.js` — sealed `BN-RCPT-*` receipts
     (seven-field SHA-256)
   - `sentinel-integrity-policy-gate.js` — DRIFT_DETECTED / DEGRADED /
     quarantine / Fundacion DENY
   - `continuous-integrity-sentinel-daemon.js` — facade
     (`createContinuousIntegritySentinelDaemon`, `startHeartbeat`,
     `stopHeartbeat`, `pulseCheck`, `isolateDrift`, `verifyReceiptTrail`)
2. Use hermetic Node `crypto` + `timers` + `events` only; no net/fs writes
   outside hermetic fixtures; Fundacion ALWAYS_DENY.
3. Seal every pulse outcome (OK / DENY) with canonical seven-field SHA-256
   body; chain `prevReceiptHash`; verify trails.
4. Scheduler honesty: `setInterval` + `.unref()`; `stopHeartbeat` /
   `isolateDrift` clear timers (no hanging timers).
5. Optional injectable ports (`freezeDriftObserver`, `contractDriftMonitor`,
   `fdirSentinel`) — compose without exclusive ownership or rewrite.
6. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on BN-owned `sentinel-*` /
   `continuous-*` files only.
7. Exclude hermetic BN tests from SLIM (≤145) via CRLF-safe patcher
   (same pattern as BH/BK/BM).

## Alternatives considered AND REJECTED

### A. Manual on-demand only (no heartbeat daemon)

**Rejected.** Relying solely on ad-hoc manual integrity checks without a
typed heartbeat daemon, sealed BN-RCPT-* custody, or quarantine path would
leave continuous integrity as implicit operator ritual — not fail-closed
evidence. Technical reason: deterministic `startHeartbeat` /
`pulseCheck` / `isolateDrift` with sealed receipts is required for BN DoD;
manual-only is insufficient for continuous sentinel fabric.

### B. Heavy APM product

**Rejected.** Shipping a Datadog/New Relic-class APM agent (or equivalent
vendor telemetry collector) would claim monitoring-product completeness,
require network listeners and vendor credentials, and break
Antigravity-first. Technical reason: NON-CLAIM `heavyApm=false` /
`monitoringProduct=false` / `cloudAgent=false`; daemon is local hermetic
integrity heartbeat custody, not an APM product.

### C. Async unverified polling

**Rejected.** Fire-and-forget async polls without sealed receipts,
`prevReceiptHash` chaining, fail-closed DRIFT_DETECTED/DEGRADED gates, or
timer lifecycle honesty (unref/clear) would allow silent drift and hanging
timers. Technical reason: canonical seven-field SHA-256 seal + trail verify
+ stop-clears-timer is required for BN DoD.

## Consequences

- Payload ships ADR-0031 + evidence + OpenSpec (epistemic parity with BM/BK).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bn`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention).
- BO–BQ remain pending; L17–L20 stay CLOSED forever relative to this ladder.
- PRODUCTION_READY stays NO; freeze-drift/fdir/governance untouched.

## NON-CLAIM

- ≠ Datadog / Prometheus / K8s daemonset
- ≠ heavy APM
- ≠ PRODUCTION_READY=YES monitoring product
- ≠ reopening L17 / L18 / L19 / L20
- ≠ BO–BQ implementation in this change
- ≠ rewrite of `src/core/freeze-drift` / `fdir` / `governance`
