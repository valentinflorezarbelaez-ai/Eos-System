# Spec — ladder15-seam-pack (SPEC-0044 / Mission AM)

## Requirement: Seam-pack requires Ladder 15 satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:multi-session-autonomy` (Mission AI)
- `test:evidence-economy-ledger` (Mission AJ)
- `test:constitution-runtime-policy-gate` (Mission AK)
- `test:autonomy-replay-forensic-observer` (Mission AL)

after prior packs (including Ladder 12/13/14 when present). The job SHALL
keep Fundacion freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission AM lock suite
- WHEN ci.yml is read
- THEN each of the four `npm run <script>` lines is present

## Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 15 CI scripts
- `test:ladder15-pack` chaining the four + `test:mission-am`
- `test:mission-am` / `test:am15` pointing at `tests/eos-am-ladder15-seam-pack.test.js`
- `test:mission-ai` / `test:mission-aj` / `test:mission-ak` / `test:mission-al` aliases (seeded if missing)
- Primary lock paths:
  - `test:multi-session-autonomy` → `tests/eos-ai-multi-session-autonomy.test.js`
  - `test:evidence-economy-ledger` → `tests/eos-aj-evidence-economy-ledger.test.js`
  - `test:constitution-runtime-policy-gate` → `tests/eos-ak-constitution-runtime-policy-gate.test.js`
  - `test:autonomy-replay-forensic-observer` → `tests/eos-al-autonomy-replay-forensic-observer.test.js`

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` SHALL document Mission AM / Ladder 15.
`scripts/ci/assert-gha-contract.js` SHOULD assert each satellite needle when patched.

## Requirement: Ladder 15 closeout honesty

`docs/releases/EOS_LADDER_15_CLOSEOUT_2026-09-12.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, and NON-CLAIM that CI pass ≠ production /
≠ GH enforcement upgrade / ≠ GH billing.
CLOSED_FOR_LOCAL_GOVERNED_USE SHALL NOT imply PRODUCTION_READY=YES.

## Requirement: Slim ceiling held

Mission AM SHALL NOT raise TR-01. The lock basename
`eos-am-ladder15-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
AI/AJ/AK/AL satellite suites remain slim-excluded.

## Requirement: CRLF-safe patcher

`scripts/patch-mission-am.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers and `[\s\S]` for multi-line Set matchers so Windows CRLF
hosts do not break idempotent patches.
