# Design — Mission EK Backpressure & Load-Shed Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EK-RCPT-*`); freeze soft-observe `5e5af281` (`tipRewriteRefused`, `l36AutoCloseRefused`, `l35ReopenRefused`…`l30ReopenRefused`, `liveTimerRefused`, `networkSheddingRefused`, `schemaJsonAddRefused`); loadShedHold marks hermetic in-memory / fail-closed / live timer refused / network shedding refused / wall-clock authority refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromEjAdmissionQuota / distinctFromDxCircuitBreaker.
2. **Policy gate** — fail-closed preconditions; `load` must carry `loadId` + `resourceClass`; optional `pressureThreshold` / `observedPressure` (hermetic injection); PASS under threshold; SHED + `PRESSURE_EXCEEDED` when observed pressure exceeds threshold; DENY for live timers / network shedding / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L35 reopen / L36 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `loadDigest` + `prevReceiptHash`; PASS seals hermetic backpressure (≠ EJ quota ≠ DX trip ≠ live timers); SHED fail-closed on pressure exceed; never flips PRODUCTION_READY; never binds real timers or network shedding.

## Distinction from EJ and DX

| EJ (admission / intake quotas) | EK (backpressure / load-shed) | DX (circuit breaker) |
| --- | --- | --- |
| maxConcurrent / maxQueueDepth | pressureThreshold / observedPressure | failureThreshold / cooldownMs |
| Admit / DENY under capacity | PASS / SHED under pressure | CLOSED → OPEN → HALF_OPEN trip |
| Fail-closed refuse when over quota | Fail-closed shed when over pressure | Resilient fallback on trip |
| Upstream intake gate | Downstream shed after admit | Fault-trip oriented |

## Non-claims

PASS/SHED ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ DX trip ≠ live timers ≠ network shedding. Soft-observe ≠ tip rewrite. Mission EK ≠ L36 closeout. Tip-refresh post-EK is SEPARATE next.
