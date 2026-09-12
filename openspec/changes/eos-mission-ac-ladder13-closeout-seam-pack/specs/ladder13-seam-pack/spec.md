# Spec — ladder13-seam-pack (SPEC-0034 / Mission AC)

## Requirement: Seam-pack requires Ladder 13 satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:target-flight` (Mission Z)
- `test:multi-agent-swarm` (Mission AA)
- `test:telemetry-server` (Mission AB)

after prior packs (including Ladder 12 V/W/X when present). The job SHALL
keep Fundacion freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission AC lock suite
- WHEN ci.yml is read
- THEN each of the three `npm run <script>` lines is present

## Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the three Ladder 13 scripts
- `test:ladder13-pack` chaining the three
- `test:mission-ac` / `test:ac13` pointing at `tests/eos-ac-ladder13-seam-pack.test.js`
- `test:mission-z` / `test:mission-aa` / `test:mission-ab` aliases (seeded if missing)

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` SHALL document Mission AC / Ladder 13.
`scripts/ci/assert-gha-contract.js` SHOULD assert each satellite needle when patched.

## Requirement: Ladder 13 closeout honesty

`docs/releases/EOS_LADDER_13_CLOSEOUT_2026-09-12.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, and NON-CLAIM that CI pass ≠ production /
≠ GH enforcement upgrade.

## Requirement: Slim ceiling held

Mission AC SHALL NOT raise TR-01. The lock basename
`eos-ac-ladder13-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
Satellite suites remain slim-excluded.
