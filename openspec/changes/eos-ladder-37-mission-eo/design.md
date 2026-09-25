# Design — Mission EO Feature-Flag & Runtime Toggle Governance

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`EO-RCPT-*`); freeze soft-observe `f333afaf` (`tipRewriteRefused`, `l37AutoCloseRefused`, `l36ReopenRefused`…`l30ReopenRefused`, `remoteConfigSdkRefused`, `wallClockRolloutAuthorityRefused`, `schemaJsonAddRefused`); toggleHold marks hermetic in-memory / fail-closed / remote config SDK refused / wall-clock rollout refused / tip rewrite refused / schema-json add refused / governed seal only / distinctFromSentinelKillswitch / distinctFromFdirTrip / distinctFromEjAdmission / distinctFromEhTemporalHonesty.
2. **Policy gate** — fail-closed preconditions; `toggle` must carry `flagKey` + `toggleClass` + `desiredState` (`ON|OFF|HOLD`); optional `observedState` (hermetic injection); `authorized` must be `true`; PASS evaluates under authority; DENY + `TOGGLE_UNAUTHORIZED` / `INVALID_TOGGLE_CLAIM` on unauthorized/mismatch; DENY for remote config SDKs / wall-clock rollout / killswitch-as-port / FDIR-as-axis / missing fields / governance violations; refuse schema-json add / tip rewrite / PR flip / GHE / L30–L36 reopen / L37 auto-close / mass prune / secrets / Fundacion / network write.
3. **Port** — `govern` + `verifyTrail`; chains receipts with `toggleDigest` + `prevReceiptHash`; PASS seals hermetic toggle evaluation (≠ killswitch port ≠ FDIR axis ≠ remote config SDK); DENY fail-closed on unauthorized/invalid claim; never flips PRODUCTION_READY; never binds live remote config SDKs or wall-clock rollout authority.

## Distinction from killswitch / FDIR / EJ / EH

| Surface | EO (feature-flag / runtime toggle) |
| --- | --- |
| sentinel-killswitch / FDIR trip | Runtime panic / freeze — fold concerns into fail-closed toggle; do NOT make killswitch the port or reopen FDIR as axis |
| EJ–EM admission/backpressure | Intake quotas / shed / bulkhead / capacity honesty — distinct L36 axis |
| EH temporal honesty | Deadline/TTL attestation — distinct L35 honesty surface |
| EO | Hermetic flagKey/toggleClass/desiredState + authorized; observedState injected |

## Non-claims

PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ killswitch port ≠ FDIR axis ≠ live remote config SDK ≠ wall-clock rollout authority. Soft-observe ≠ tip rewrite. Mission EO ≠ L37 closeout. Tip-refresh post-EO is SEPARATE next.
