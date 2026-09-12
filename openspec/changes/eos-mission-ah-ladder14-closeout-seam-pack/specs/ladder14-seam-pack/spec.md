# Spec — ladder14-seam-pack (SPEC-0039 / Mission AH)

## Requirement: Seam-pack requires Ladder 14 satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:llm-provider-port` (Mission AD)
- `test:token-budget-ecr` (Mission AE)
- `test:autonomous-loop` (Mission AF; alias of `test:autonomous-execution-loop`)
- `test:live-tool-engine` (Mission AG)

after prior packs (including Ladder 12/13 when present). The job SHALL
keep Fundacion freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission AH lock suite
- WHEN ci.yml is read
- THEN each of the four `npm run <script>` lines is present

## Requirement: Pack aliases + lock scripts + AF dual name

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 14 CI scripts
- `test:ladder14-pack` chaining the four + `test:mission-ah`
- `test:mission-ah` / `test:ah14` pointing at `tests/eos-ah-ladder14-seam-pack.test.js`
- `test:autonomous-execution-loop` AND alias `test:autonomous-loop` to the same AF test file
- `test:mission-ad` / `test:mission-ae` / `test:mission-af` / `test:mission-ag` aliases (seeded if missing)

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` SHALL document Mission AH / Ladder 14.
`scripts/ci/assert-gha-contract.js` SHOULD assert each satellite needle when patched
(including `test:autonomous-loop`).

## Requirement: Ladder 14 closeout honesty

`docs/releases/EOS_LADDER_14_CLOSEOUT_2026-09-12.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, and NON-CLAIM that CI pass ≠ production /
≠ GH enforcement upgrade / ≠ GH billing.

## Requirement: Slim ceiling held

Mission AH SHALL NOT raise TR-01. The lock basename
`eos-ah-ladder14-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
AD/AE/AF/AG satellite suites remain slim-excluded.

## Requirement: CRLF-safe patcher

`scripts/patch-mission-ah.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers so Windows CRLF hosts do not break idempotent patches.
