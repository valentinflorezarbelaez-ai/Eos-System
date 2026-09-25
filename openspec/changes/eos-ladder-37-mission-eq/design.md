# Design — Mission EQ Config Change / Staged Activation Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EQ-RCPT-*`); freeze soft-observe `748000c3` (`tipRewriteRefused`, `l37AutoCloseRefused`, `l36ReopenRefused`…`l30ReopenRefused`, `remoteConfigPushRefused`, `wallClockAuthorityRefused`, `liveUnsupervisedMutationRefused`, `tipRefreshAuthorityRefused`, `schemaJsonAddRefused`); activationHold marks hermetic in-memory / fail-closed / remote config push refused / wall-clock refused / live unsupervised mutation refused / tip-refresh authority refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromEoFeatureFlag / distinctFromEpPolicyPackBinding / distinctFromDxCircuitBreaker / distinctFromEjAdmission / distinctFromEkBackpressure / distinctFromEgScheduleWake / distinctFromEhTemporalHonesty.
2. **Policy gate** — fail-closed preconditions; `activation` must carry `configKey` + `activationClass` + `desiredStage` (`STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD`); optional `observedActivation` (hermetic injection); `authorized` must be `true`; PASS evaluates under authority; DENY + `ACTIVATION_UNAUTHORIZED` / `INVALID_ACTIVATION_CLAIM` on unauthorized/mismatch; DENY for remote config push / wall-clock / live unsupervised mutation / tip-refresh authority / EO-as-activation / EP-as-activation / FDIR-as-axis / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L36 reopen / L37 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `activationDigest` + `prevReceiptHash`; PASS seals hermetic staged activation (≠ EO flag ≠ EP pack ≠ FDIR axis ≠ remote config push); DENY fail-closed on unauthorized/invalid claim; never flips PRODUCTION_READY; never performs live unsupervised mutation or remote config push.

## Distinction from EO / EP / EJ / EK / EG / EH

| Surface | EQ (staged activation) |
| --- | --- |
| EO feature-flag / runtime toggle | Flag ON/OFF/HOLD — distinct; do NOT elevate EO as activation port |
| EP policy-pack binding | Pack bind+evaluate BOUND/UNBOUND/HOLD — distinct |
| DX circuit breaker / FDIR | Fold emergency-override narrowly into fail-closed staged activation; do NOT reopen FDIR/DX as axis |
| EJ–EK admission/backpressure | Intake quotas / shed — distinct L36 axis |
| EG schedule wake | Deferred wake — distinct |
| EH temporal honesty | Deadline/TTL attestation — distinct L35 honesty surface |
| EQ | Hermetic configKey/activationClass/desiredStage + authorized; observedActivation injected |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag port ≠ EP pack port ≠ FDIR axis ≠ live unsupervised mutation ≠ wall-clock authority ≠ remote config push. Soft-observe ≠ tip rewrite. Mission EQ ≠ L37 closeout. Tip-refresh post-EQ is SEPARATE next.
