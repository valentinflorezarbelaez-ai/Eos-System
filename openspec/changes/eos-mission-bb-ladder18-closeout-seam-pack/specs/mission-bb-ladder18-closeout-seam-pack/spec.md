# Spec — mission-bb-ladder18-closeout-seam-pack (SPEC-0059 / Mission BB)

## Requirement: Seam-pack requires Ladder 18 satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:developer-engine-core` (Mission AX)
- `test:ast-semantic-port` (Mission AY)
- `test:self-repair-bridge` (Mission AZ)
- `test:local-sandbox-port` (Mission BA)

after prior packs (including Ladder 12/13/14/15/16/17 when present). The job SHALL
keep Fundacion freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission BB lock suite
- WHEN ci.yml is read
- THEN each of the four `npm run <script>` lines is present

### Scenario: Any AX–BA seam-pack job fails

- GIVEN CI seam-pack with Ladder 18 satellites
- WHEN any AX–BA npm test script fails
- THEN the CI contract SHALL fail (no soak / no continue-on-error)

## Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 18 CI scripts
- `test:ladder18-pack` chaining the four + `test:mission-bb`
- `test:mission-bb` / `test:bb18` / `test:l18` pointing at `tests/eos-bb-ladder18-seam-pack.test.js`
- `test:mission-ax` / `test:mission-ay` / `test:mission-az` / `test:mission-ba` aliases (seeded if missing)
- Primary lock paths:
  - `test:developer-engine-core` → `tests/eos-ax-sovereign-developer-engine.test.js`
  - `test:ast-semantic-port` → `tests/eos-ay-ast-semantic-port.test.js`
  - `test:self-repair-bridge` → `tests/eos-az-self-repair-fdir-bridge.test.js`
  - `test:local-sandbox-port` → `tests/eos-ba-local-sandbox-container-port.test.js`

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` OR `docs/releases/CI_CD_CONTRACT.md` SHALL document Mission BB / Ladder 18.
`scripts/ci/assert-gha-contract.js` SHOULD assert each satellite needle when patched.

## Requirement: Ladder 18 closeout honesty

`docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, AX+AY+AZ+BA+BB MEASURED, and NON-CLAIM that CI pass ≠ production /
≠ GH enforcement upgrade / ≠ GH billing /
developer-engine ≠ cloud IDE / AST ≠ PR LLM / self-repair ≠ unsupervised prod / sandbox ≠ K8s SaaS.
CLOSED_FOR_LOCAL_GOVERNED_USE SHALL NOT imply PRODUCTION_READY=YES.
L17 SHALL remain CLOSED (never reopen).
Tip honesty ritual SHALL be deferred to post-BB tip refresh (not this mission).
Expected tip SHALL document StartsWith `b206bf3` (full `b206bf3ebcab797ade293bff4da59a11af8e5f06`).

## Requirement: Slim ceiling held

Mission BB SHALL NOT raise TR-01. The lock basename
`eos-bb-ladder18-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
AX/AY/AZ/BA satellite suites remain slim-excluded.

## Requirement: CRLF-safe patcher

`scripts/patch-mission-bb.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers and `[\s\S]` for multi-line Set matchers so Windows CRLF
hosts do not break idempotent patches.
