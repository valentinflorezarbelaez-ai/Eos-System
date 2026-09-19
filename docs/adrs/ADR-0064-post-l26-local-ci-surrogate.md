# ADR-0064: Post-L26 Local CI Surrogate Hardening

- **Status:** Accepted (Workstream C of ADR-0059)
- **Date:** 2026-09-19
- **Owner:** Valentin Florez
- **Related:** ADR-0059 (post-L26 backlog), ADR-0062 (A), ADR-0063 (B), CI/CD contract, verify:strict

## Context

Ladder 26 is sealed `CLOSED_FOR_LOCAL_GOVERNED_USE` (Mission CP #365 @ `47cf1a79` + tip-seal #366). GitHub Actions remains **billing-blocked**. Operators need a repeatable local gate that:

1. Runs or records `verify:strict` with documented prerequisites and deterministic exit codes.
2. Treats mission packs as SSOT — drift is detected, never silently tolerated.
3. Records billing-blocked CI as an **environment limitation**, not as a passing CI result.
4. Covers a failure matrix: missing evidence, dirty tree, stale freeze, mission-pack drift.

Host live scan is often BLOCKED for the hermetic executor (machineId does not Shell-route). Implementation ships as a hermetic package + host-apply patch script; parent CopyFromBox applies to the Windows clone.

## Decision

1. Add `src/core/ci/local-ci-surrogate.js` as the fail-closed local CI surrogate SSOT.
2. Always emit `ci_environment: { github_actions: 'BILLING_BLOCKED', local_surrogate: 'ACTIVE', github_actions_verdict: 'NOT_RUN' }`. Overrides attempting to claim GH green are refused.
3. Mission-pack identity = hash of known mission test file bodies + package.json script map fingerprint; compare to expected SSOT identity.
4. Freeze tip vs HEAD lag: soft-import `doctor-hud-honesty` when present; otherwise built-in lag helpers. Stale freeze (wrong tip identity, HEAD behind, unmeasured diverge) fails closed.
5. Dirty tree blocks the surrogate gate.
6. `verify:strict` via injected runner or `recordedResult` — never invent a pass when evidence/runner missing.
7. Host patcher `scripts/patch-post-l26-c.mjs` adds `test:ci-surrogate` / `ci:surrogate` (+ SLIM exclude on host).
8. Keep `PRODUCTION_READY=NO`. Never reopen L17–L26. No L27. Fundacion Δ=0. Law VI.

## Non-decisions

- Local surrogate success is **not** GitHub Actions success and is **not** production readiness.
- Billing-blocked is **not** recorded as green CI.
- No Fundacion writes. No GH billing / branch-protection changes.
- No L27. No reopen of L17–L26.

## Consequences

- Operators have a deterministic local gate while GH Actions cannot run.
- Mission-pack drift cannot silently pass the surrogate.
- Gate records always show BILLING_BLOCKED — auditors cannot confuse local pass with remote CI green.
- Parent must CopyFromBox + patch on host and supply live freeze/HEAD/mission identity for real runs.

## Acceptance

- Hermetic `node --test tests/eos-post-l26-c-local-ci-surrogate.test.js` green (pass + failure matrix).
- `node --check` on changed JS.
- RESULT.json `POST_L26_C_CI_SURROGATE_READY`.
- APPLY note documents host wire-up and prerequisites.
