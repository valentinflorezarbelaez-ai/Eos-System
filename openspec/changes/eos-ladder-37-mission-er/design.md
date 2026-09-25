# Design — Mission ER Config Honesty & Flag Attestation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`ER-RCPT-*`); freeze soft-observe `7ee4bd49` (`tipRewriteRefused`, `l37AutoCloseRefused`, `l36ReopenRefused`…`l30ReopenRefused`, `liveFlagStoreClaimRefused`, `wallClockAuthorityRefused`, `liveUnsupervisedMutationRefused`, `tipRefreshAuthorityRefused`, `schemaJsonAddRefused`, `softObserveAloneNotConfigTruth`); attestationHold marks hermetic in-memory / fail-closed / live flag store refused / wall-clock refused / unsupervised mutation refused / tip-refresh authority refused / tip rewrite refused / schema-json add refused / productionReadyFlip refused / governed seal only / softObserveAloneNotConfigTruth / distinctFromEoFeatureFlag / distinctFromEpPolicyPackBinding / distinctFromEqStagedActivation / distinctFromEmCapacityHonesty / distinctFromEhTemporalHonesty.
2. **Policy gate** — fail-closed preconditions; `attestation` must carry `subjectKind` (`FEATURE_FLAG|POLICY_PACK|STAGED_ACTIVATION|COMPOSITE`) + `honestyClaims` (`softObserveFreeze`, `noLiveFlagStore`, `productionReadyNo`, `schemasAtCeiling`); optional hermetic `observedClaim`; `authorized` must be `true`; PASS evaluates under authority; DENY + `ATTESTATION_UNAUTHORIZED` / `INVALID_ATTESTATION_CLAIM` on unauthorized/mismatch; DENY for live flag store honesty lie / soft-observe-as-config-truth / wall-clock / unsupervised mutation / tip-refresh authority / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L36 reopen / L37 auto-close / mass prune / secrets / Fundacion.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `attestationDigest` + `prevReceiptHash`; PASS seals hermetic config/flag honesty attestation (≠ EO toggle ≠ EP pack ≠ EQ staged activation ≠ EM capacity ≠ EH temporal ≠ live flag store); DENY fail-closed on unauthorized/invalid claim; never flips PRODUCTION_READY; never flips flags or activates config; never performs live unsupervised mutation.

## Distinction from EO / EP / EQ / EM / EH

| Surface | ER (config honesty attestation) |
| --- | --- |
| EO feature-flag / runtime toggle | Flag ON/OFF/HOLD — distinct; ER does not flip flags |
| EP policy-pack binding | Pack bind+evaluate BOUND/UNBOUND/HOLD — distinct |
| EQ staged activation | Staged/canary/full activation governance — distinct; ER does not activate config |
| EM capacity honesty | Admission/load-shed/bulkhead honesty — distinct L36 capacity axis |
| EH temporal honesty | Deadline/TTL attestation — distinct L35 honesty surface |
| ER | Hermetic subjectKind + honestyClaims + authorized; observedClaim injected; soft-observe alone ≠ config truth |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag toggle ≠ EP pack binding ≠ EQ staged activation ≠ EM capacity honesty ≠ EH temporal honesty ≠ live flag store ≠ wall-clock authority ≠ unsupervised mutation. Soft-observe alone ≠ config truth. Soft-observe ≠ tip rewrite. Mission ER ≠ L37 closeout. Tip-refresh post-ER is SEPARATE next.
