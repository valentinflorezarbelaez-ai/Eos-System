# Design — Mission EP Policy-Pack Binding & Evaluation

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EP-RCPT-*`); freeze soft-observe `75131386` (`tipRewriteRefused`, `l37AutoCloseRefused`, `l36ReopenRefused`…`l30ReopenRefused`, `remoteConfigSdkRefused`, `wallClockRolloutAuthorityRefused`, `schemaJsonAddRefused`); packHold marks hermetic in-memory / fail-closed / remote policy engine refused / wall-clock rollout refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromSentinelKillswitch / distinctFromFdirTrip / distinctFromEjAdmission / distinctFromEhTemporalHonesty.
2. **Policy gate** — fail-closed preconditions; `toggle` must carry `packId` + `bindingClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional `observedBinding` (hermetic injection); `authorized` must be `true`; PASS evaluates under authority; DENY + `TOGGLE_UNAUTHORIZED` / `INVALID_TOGGLE_CLAIM` on unauthorized/mismatch; DENY for remote policy engines / wall-clock rollout / EO-feature-flag-as-pack / FDIR-as-axis / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L36 reopen / L37 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `toggleDigest` + `prevReceiptHash`; PASS seals hermetic toggle evaluation (≠ killswitch port ≠ FDIR axis ≠ remote policy engine); DENY fail-closed on unauthorized/invalid claim; never flips PRODUCTION_READY; never binds live remote policy engines or wall-clock authority.

## Distinction from killswitch / FDIR / EJ / EH

| Surface | EO (policy-pack binding / evaluation) |
| --- | --- |
| EO feature-flag / DX circuit breaker / EJ admission | Runtime panic / freeze — fold concerns into fail-closed toggle; do NOT make killswitch the port or reopen FDIR as axis |
| EJ–EM admission/backpressure | Intake quotas / shed / bulkhead / capacity honesty — distinct L36 axis |
| EH temporal honesty | Deadline/TTL attestation — distinct L35 honesty surface |
| EO | Hermetic packId/bindingClass/desiredBinding + authorized; observedBinding injected |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ killswitch port ≠ FDIR axis ≠ live remote policy engine ≠ wall-clock authority. Soft-observe ≠ tip rewrite. Mission EP ≠ L37 closeout. Tip-refresh post-EP is SEPARATE next.
