# Spec — ladder16-seam-pack (SPEC-0049 / Mission AR)

## Requirement: Seam-pack requires Ladder 16 satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:multi-workstation-federation` (Mission AN)
- `test:provider-failover-resilience` (Mission AO)
- `test:hitl-po-authority` (Mission AP)
- `test:evidence-export-notarization` (Mission AQ)

after prior packs (including Ladder 12/13/14/15 when present). The job SHALL
keep Fundacion freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission AR lock suite
- WHEN ci.yml is read
- THEN each of the four `npm run <script>` lines is present

### Scenario: Any AN–AQ seam-pack job fails

- GIVEN CI seam-pack with Ladder 16 satellites
- WHEN any AN–AQ npm test script fails
- THEN the CI contract SHALL fail (no soak / no continue-on-error)

## Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 16 CI scripts
- `test:ladder16-pack` chaining the four + `test:mission-ar`
- `test:mission-ar` / `test:ar16` / `test:l16` pointing at `tests/eos-ar-ladder16-seam-pack.test.js`
- `test:mission-an` / `test:mission-ao` / `test:mission-ap` / `test:mission-aq` aliases (seeded if missing)
- Primary lock paths:
  - `test:multi-workstation-federation` → `tests/eos-an-multi-workstation-session-federation.test.js`
  - `test:provider-failover-resilience` → `tests/eos-ao-provider-failover-resilience.test.js`
  - `test:hitl-po-authority` → `tests/eos-ap-hitl-po-authority-channel.test.js`
  - `test:evidence-export-notarization` → `tests/eos-aq-evidence-export-notarization.test.js`

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` SHALL document Mission AR / Ladder 16.
`scripts/ci/assert-gha-contract.js` SHOULD assert each satellite needle when patched.

## Requirement: Ladder 16 closeout honesty

`docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, AN–AQ+AR MEASURED, and NON-CLAIM that CI pass ≠ production /
≠ GH enforcement upgrade / ≠ GH billing /
federation ≠ fleet / failover ≠ PR LLM / HITL ≠ GH enforcement / export ≠ compliance cert.
CLOSED_FOR_LOCAL_GOVERNED_USE SHALL NOT imply PRODUCTION_READY=YES.
Tip honesty ritual SHALL be deferred to post-AR tip refresh (not this mission).

## Requirement: Slim ceiling held

Mission AR SHALL NOT raise TR-01. The lock basename
`eos-ar-ladder16-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
AN/AO/AP/AQ satellite suites remain slim-excluded.

## Requirement: CRLF-safe patcher

`scripts/patch-mission-ar.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers and `[\s\S]` for multi-line Set matchers so Windows CRLF
hosts do not break idempotent patches.
