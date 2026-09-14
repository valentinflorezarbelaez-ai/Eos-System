# Design — Mission BN Continuous Integrity Sentinel & FDIR Heartbeat Daemon (SPEC-0071)

## Overview

Layer-0 hermetic continuous integrity sentinel under NEW `src/core/sentinel/`.
SHA-256 via `node:crypto`; deterministic scheduler via `node:timers` +
`node:events`. Fail-closed DENY + sealed failure receipt. Optional injectable
ports compose AV freeze-drift / contract-drift / R FDIR without rewriting
those siblings.

## Components

1. **Receipt** — seven-field SHA-256 seal:
   `{ receiptId, pulseIndex, timestamp, targetManifestHash, integrityStatus,
     anomaliesDetected, prevReceiptHash }` → `BN-RCPT-*`
2. **Policy gate** — DRIFT_DETECTED, DEGRADED, QUARANTINED,
   FUNDACION_ALWAYS_DENY, malformed DENY
3. **Daemon** — `createContinuousIntegritySentinelDaemon({ now, hash, intervalMs, ports })`
   - `startHeartbeat({ intervalMs? })` — setInterval + unref; intervalMs=0 → manual
   - `stopHeartbeat()` — clearInterval; no hanging timers
   - `pulseCheck(...)` — gate → seal BN-RCPT-*
   - `isolateDrift(...)` — quarantine + stop heartbeat
   - `verifyReceiptTrail(receipts)` — hash + chain custody

## Scheduler honesty

- Timers always `.unref()` so Node can exit
- `stopHeartbeat` and successful `isolateDrift` clear the interval
- Hermetic tests assert no post-stop pulses

## Constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Antigravity-first; Law VI CLEAN
- NO rewrite of freeze-drift/ / fdir/ / governance/
- SLIM ≤145 via exclude of BN hermetic satellite test (like BH/BK/BM)
- L17–L20 CLOSED never reopen; L21 OPEN

## NON-CLAIM

≠ Datadog/Prometheus/K8s daemonset · ≠ heavy APM · ≠ PRODUCTION_READY=YES monitoring product
