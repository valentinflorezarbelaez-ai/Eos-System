# Design — Mission EJ Admission Control & Work-Intake Quotas

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EJ-RCPT-*`); freeze soft-observe `d7490fee` (`tipRewriteRefused`, `l36AutoCloseRefused`, `l35ReopenRefused`…`l30ReopenRefused`, `liveOsSchedulerRefused`, `networkRateLimiterRefused`, `schemaJsonAddRefused`); admissionHold marks hermetic in-memory / fail-closed / live OS scheduler refused / network rate limiter refused / wall-clock authority refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromDxCircuitBreaker.
2. **Policy gate** — fail-closed preconditions; `intake` must carry `intakeId` + `workClass`; optional `maxConcurrent` / `maxQueueDepth` / `observedInflight` / `observedQueued` (hermetic injection); PASS admits under quota; DENY + `QUOTA_EXCEEDED` when observed load exceeds quota; DENY for live OS schedulers / rate limiters / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L35 reopen / L36 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `intakeDigest` + `prevReceiptHash`; PASS seals hermetic admission (≠ DX trip ≠ live OS scheduler); DENY fail-closed on quota exceed; never flips PRODUCTION_READY; never binds real OS schedulers or network rate limiters.

## Distinction from DX

| DX (circuit breaker) | EJ (admission / intake quotas) |
| --- | --- |
| failureThreshold / cooldownMs | maxConcurrent / maxQueueDepth |
| CLOSED → OPEN → HALF_OPEN trip | Admit / DENY under capacity |
| Resilient fallback on trip | Fail-closed refuse when over quota |
| Soft-compose DW/DV/DU | Hermetic injected observedInflight/observedQueued |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ DX trip ≠ live OS scheduler ≠ network rate limiter. Soft-observe ≠ tip rewrite. Mission EJ ≠ L36 closeout. Tip-refresh post-EJ is SEPARATE next.
