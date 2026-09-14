# Proposal — Mission BN Continuous Integrity Sentinel & FDIR Heartbeat Daemon (SPEC-0071)

## Why

Ladder 21 axis **Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric**
needs a typed, fail-closed **Continuous Integrity Sentinel & FDIR Heartbeat Daemon**
that pulses hermetic integrity checks, seals every outcome under `BN-RCPT-*`
custody, and quarantines drift — composing R FDIR sentinel + AZ self-repair
FDIR bridge + AV freeze-drift + BH lifecycle observe after BM MEASURED /
L20 CLOSED. Without it, continuous integrity remains implicit docs — not
sealed BN-RCPT-* heartbeat provenance.

## What changes

- New Layer-0 modules under `src/core/sentinel/` (NEW dir; do NOT rewrite
  `freeze-drift/` / `fdir/` / `governance/`):
  - `sentinel-heartbeat-receipt.js` — sealed `BN-RCPT-*` receipts
  - `sentinel-integrity-policy-gate.js` — fail-closed integrity policy
  - `continuous-integrity-sentinel-daemon.js` — facade
    (`startHeartbeat`, `stopHeartbeat`, `pulseCheck`, `isolateDrift`,
    `verifyReceiptTrail`)
- Optional injectable ports: `freezeDriftObserver`, `contractDriftMonitor`,
  `fdirSentinel` (stubs in tests)
- Hermetic tests `tests/eos-bn-continuous-integrity-sentinel.test.js`
- CRLF-safe patcher `scripts/patch-mission-bn.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0031, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- Datadog / Prometheus / K8s daemonset / heavy APM product claims
- BO–BQ implementation
- Reopening L17 / L18 / L19 / L20
- Rewriting `src/core/freeze-drift` / `fdir` / `governance`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 / L20 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L21 | OPEN (BM MEASURED; BN in progress; BO–BQ pending) |
| Axis | Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BN test excluded like BH/BK/BM) |
| Base tip | `5c9ec4db9165070e911b6121caba497d968d6050` (StartsWith `5c9ec4d`) |
