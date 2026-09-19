# Spec — Mission CQ Local CI Continuity Port (SPEC-0100)

## Requirement: Local CI continuity receipt

The system SHALL seal `CQ-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY|HOLD), `runId`, `continuityDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `continuityMode` (ACTIVE|HOLD), forced `ciEnvironment` with `github_actions=BILLING_BLOCKED`, `local_surrogate=ACTIVE`, `github_actions_verdict=NOT_RUN`, optional dirty/stale/drift/verifyOk summary, `reasons[]`, and `continuityPlanDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`, `runId`, and `continuityMode` ∈ {ACTIVE, HOLD}; require sha256 `continuityDigest` or `surrogateInput`/`gateSnapshot`; ALWAYS_DENY Fundacion; DENY Law VI secrets; DENY claims of PRODUCTION_READY=YES flip, GitHub Actions green, or GH Enterprise enforcement; refuse ciEnvironment overrides that claim GH PASS/GREEN; reject empty plans, oversize reasons, and invalid or tampered digests.

## Requirement: Local CI continuity port

`LocalCiContinuityPort.govern(plan)` (and alias `evaluate(plan)`) SHALL evaluate the gate; soft-import `local-ci-surrogate.js` when present (compose, don't rewrite) or use injected/fixture/builtin double; on valid plans map ACTIVE+surrogate-ok→PASS and HOLD→HOLD; emit PASS, DENY, or HOLD with a sealed receipt that never claims GH green; store successful decisions by planId in memory; and expose `verifyTrail()`. The port SHALL NOT use network or GH API.

## Requirement: Non-claims

The package SHALL NOT claim GitHub Actions green, GHE required-check enforcement, Fundacion writes, `PRODUCTION_READY=YES`, reopen of L17–L26, or L27 closeout. L27 remains OPEN (Audit MEASURED · CQ in progress · CR–CU pending). Port green ≠ L27 closeout.
