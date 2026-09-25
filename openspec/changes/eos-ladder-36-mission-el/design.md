# Design — Mission EL Resource Isolation / Bulkhead Boundary

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EL-RCPT-*`); freeze soft-observe `72697dd5` (`tipRewriteRefused`, `l36AutoCloseRefused`, `l35ReopenRefused`…`l30ReopenRefused`, `liveThreadRefused`, `realProcessIsolationRefused`, `schemaJsonAddRefused`); bulkheadHold marks hermetic in-memory / fail-closed / live thread refused / real process isolation refused / wall-clock authority refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromEjAdmissionQuota / distinctFromEkLoadShed / distinctFromDxCircuitBreaker.
2. **Policy gate** — fail-closed preconditions; `bulkhead` must carry `bulkheadId` + `poolId`; optional `capacity` / `observedOccupancy` / `crossBulkheadTouch` (hermetic injection); PASS under capacity without cross-touch; ISOLATE + `CROSS_BULKHEAD_BREACH` or `OCCUPANCY_EXCEEDED` when isolation violated; DENY for live threads / real process isolation / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L35 reopen / L36 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `bulkheadDigest` + `prevReceiptHash`; PASS seals hermetic isolation (≠ EJ quota ≠ EK shed ≠ DX trip ≠ live threads); ISOLATE fail-closed on breach; never flips PRODUCTION_READY; never binds real threads or process isolation.

## Distinction from EJ, EK, and DX

| EJ (admission / intake quotas) | EK (backpressure / load-shed) | EL (bulkhead / isolation) | DX (circuit breaker) |
| --- | --- | --- | --- |
| maxConcurrent / maxQueueDepth | pressureThreshold / observedPressure | capacity / observedOccupancy / crossBulkheadTouch | failureThreshold / cooldownMs |
| Admit / DENY under capacity | PASS / SHED under pressure | PASS / ISOLATE under isolation | CLOSED → OPEN → HALF_OPEN trip |
| Fail-closed refuse when over quota | Fail-closed shed when over pressure | Fail-closed isolate when breach / occupancy exceed | Resilient fallback on trip |
| Upstream intake gate | Downstream shed after admit | Pool boundary — no cascade | Fault-trip oriented |

## Non-claims

PASS/ISOLATE ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ EK shed ≠ DX trip ≠ live threads ≠ real process isolation. Soft-observe ≠ tip rewrite. Mission EL ≠ L36 closeout. Tip-refresh post-EL is SEPARATE next.
