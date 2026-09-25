# Design — Mission EM Capacity Honesty & Admission Attestation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EM-RCPT-*`); freeze soft-observe `933f32ae` (`tipRewriteRefused`, `l36AutoCloseRefused`, `l35ReopenRefused`…`l30ReopenRefused`, `liveMetricsClaimRefused`, `schemaJsonAddRefused`); attestationHold marks hermetic in-memory / live metrics refused / wall-clock capacity authority refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromEjAdmissionQuota / distinctFromEkLoadShed / distinctFromElBulkhead / distinctFromEhTemporalHonesty.
2. **Policy gate** — fail-closed preconditions; `attestation` must carry `subjectKind` + `honestyClaims` (`softObserveFreeze`, `noLiveMetrics`, `productionReadyNo`, `schemasAtCeiling`); PASS seals hermetic honesty attestation; DENY for live metrics honesty lies / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L35 reopen / L36 auto-close / mass prune / secrets / Fundacion.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `attestationDigest` + `prevReceiptHash`; PASS seals hermetic attestation (≠ EJ quota ≠ EK shed ≠ EL isolate ≠ EH temporal ≠ live metrics); never flips PRODUCTION_READY; never binds live scrapers.

## Distinction from EJ, EK, EL, and EH

| EJ (admission quotas) | EK (load-shed) | EL (bulkhead) | EH (temporal honesty) | EM (capacity honesty) |
| --- | --- | --- | --- | --- |
| maxConcurrent / maxQueueDepth | pressureThreshold / observedPressure | capacity / occupancy / crossBulkheadTouch | deadline/schedule/compensation honestyClaims | subjectKind + capacity honestyClaims |
| Admit / DENY | PASS / SHED | PASS / ISOLATE | PASS / HOLD / DENY attestation | PASS / HOLD / DENY attestation |
| Intake gate | Downstream shed | Pool boundary | Temporal axis | Capacity/admission honesty axis |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ EK shed ≠ EL isolate ≠ EH temporal ≠ live metrics ≠ soft-observe-as-capacity-truth. Soft-observe ≠ tip rewrite. Mission EM ≠ L36 closeout. Tip-refresh post-EM is SEPARATE next.
