# ADR-0160 — CI Suite Execution Honesty (Run What The Gates Claim To Run)

- **Status:** Accepted — local governed (harness hardening; no ladder satellite)
- **Date:** 2026-10-01 (America/Bogota)
- **Deciders:** EOS local governed use (harness / sensor-suite integrity)
- **Spec:** OpenSpec `eos-ci-suite-execution-honesty`
- **Prior ADRs:** ADR-0009 (GitHub Actions CI/CD), ADR-0010 (LIDR SpecBoot discipline)

> ADR numbers 0155–0159 stay reserved for the Ladder 41 satellites FI–FM declared by
> ADR-0154. This ADR is harness hardening and deliberately sits outside that range.

## Context

`.agents/AGENTS.md` §7 forbids proposing a merge "without green automated sensor suites".
An audit of the harness on `main@8903b578` showed that the sensor suites were, in large
part, not executed by any gate:

1. **Folded workflow step.** The `verify` job's *Strict workspace verification* step was
   written as `run: node scripts/verify-eos.js --strict` followed by 29 more-indented
   `npm run test:*` lines. YAML folds more-indented continuation lines into the same plain
   scalar, so the executed command was `node scripts/verify-eos.js --strict npm run
   test:llm-provider-port npm run …`. `verify-eos.js` ignores unknown argv, so the step
   passed and none of the 29 satellite suites ran.
2. **Unreachable suites.** 123 of 320 suites were registered in `SLIM_SUITE_EXCLUDES`
   (excluded from `npm test`) while no workflow-invoked npm script referenced them —
   including every Ladder 22–41 composition port suite. The CI-wiring assertion that
   Ladder ≤21 seam-packs enforced (`BQ1`) was never carried forward.
3. **Masked failure.** `npm run test:mission-bi` failed (BI7 Law VI MODULE_DIR CLEAN,
   15/16) because `src/core/continuity/fundacion-delta0-continuity-policy-gate.js`
   embedded the contiguous `ghp` + `_` provider prefix. The folded step hid it.
4. **Dangling script references.** `test:du` pointed at a non-existent
   `eos-du-domain-event-publisher.test.js` and `test:security` at `tests/mcp/red-teaming.test.js`
   in an empty directory, so the adversarial-auditor agent contract (`ai-specs/agents/adversarial-auditor.md`)
   referenced a script that could only fail.

GitHub Actions remains `BILLING_BLOCKED` (Post-L26 C / Mission CX), so `verify:strict`
plus the local test corpus are the real gates. That makes silent non-execution strictly
worse than a red check: it reads as evidence while producing none.

## Decision

1. Treat **execution reachability** as a deterministic pre-merge invariant, enforced by
   `scripts/lib/ci-suite-reachability-lock.js` in `verify-eos --strict` and in
   `tests/github-actions-cicd.test.js` (GHA-009…GHA-012). Fail-closed on:
   - any suite excluded from `npm test` that no declared gate executes;
   - any `tests/...` path referenced by a package.json script that does not exist;
   - any workflow `run:` plain scalar continued onto more-indented lines.
2. Keep the slim suite as the fast default (TR-01 ≤145 unchanged) and add explicit
   full-corpus execution: `scripts/test-runner.js --full` / `npm run test:full`, plus a
   `full-suite` job in `ci.yml` declared in `docs/governance/CI_CD_CONTRACT.json`.
   The whole corpus is 320 suites in ~12s, so exclusion no longer implies non-execution.
3. Repair the two dangling script references instead of deleting the scripts: `test:du`
   targets `eos-du-domain-event-publisher-port.test.js`; `test:security` targets the
   existing Law VI broker, secret-zero leak-deny, adversarial-bypass and write-barrier
   adversarial suites.
4. Fix the masked BI7 defect by composing the provider prefix at runtime inside the
   continuity policy gate — identical matching behaviour, no contiguous literal under
   `src/core/continuity/`.

## Alternatives Considered AND REJECTED

- Raising the TR-01 slim ceiling so every suite lands in `npm test` — REJECTED: the runner
  documents "prefer exclude-from-slim over raising TR-01 ceiling"; a separate full-corpus
  gate preserves the fast default.
- Deleting the 123 unreachable suites — REJECTED: they pass and encode ladder invariants;
  the defect was the missing gate, not the tests.
- Deleting `test:security` / `test:du` — REJECTED: both have real targets; a silent
  removal would weaken the adversarial-auditor contract.
- Re-adding per-ladder `npm run` lines to `ci.yml` for all of L22–L41 — REJECTED: an
  enumerated list is what rotted. One full-corpus job plus a fail-closed reachability lock
  is the smaller invariant (Ponytail Tier 2).
- Listing only the mission suites and leaving root-level suites unreachable — REJECTED:
  partial coverage reproduces the same honesty gap.
- Rewriting the freeze tip, flipping `PRODUCTION_READY`, adding schema JSON, or writing
  Fundacion — REJECTED: out of scope and forbidden.

## Consequences

- Positive: the gates now execute what they declare. `verify:strict` reports 923 checks /
  0 failures (was 913), `npm run test:full` reports 4201 tests / 0 failures (was 1 failure),
  unreachable suites drop from 123 to 0, and the invariant cannot rot silently again.
- Invariants preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (no secrets sealed;
  provider prefix composed, never embedded), Law VII, schemas AT_CEILING 35/35, freeze tip
  not rewritten, Ladders 17–40 CLOSED, L41 OPEN.
- Non-claims: green local gates ≠ GitHub Actions green (still `BILLING_BLOCKED`) ≠
  `PRODUCTION_READY` ≠ ladder closure.

## Links

- OpenSpec: `openspec/changes/eos-ci-suite-execution-honesty/`
- Audit evidence: `docs/audits/CI_SUITE_EXECUTION_HONESTY_AUDIT_2026-10-01.md`
- Lock: `scripts/lib/ci-suite-reachability-lock.js`
- Contract: `docs/governance/CI_CD_CONTRACT.json`
