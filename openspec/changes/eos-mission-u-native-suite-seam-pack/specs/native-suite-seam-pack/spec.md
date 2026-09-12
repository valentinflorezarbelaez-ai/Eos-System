# Spec — native-suite-seam-pack (SPEC-0026 / Mission U)

## Requirement: Seam-pack requires native satellites

The EOS CI `seam-pack` job SHALL run each of:

- `test:compute-worker-i`, `test:compute-worker-l`, `test:compute-worker-m`,
  `test:compute-worker-n`, `test:compute-worker-o`
- `test:loop-compute`, `test:worker-daemon`, `test:fdir-sentinel`,
  `test:specboot-agent`, `test:external-write-gateway`

after existing `test:compute-worker` + `test:c2`. The job SHALL keep Fundacion
freeze (delta 0). It SHALL NOT use `continue-on-error: true` or soak.

### Scenario: Satellite missing from ci.yml

- GIVEN the Mission U lock suite
- WHEN ci.yml is read
- THEN each of the ten `npm run <script>` lines is present

## Requirement: Native suite pack alias

`package.json` SHALL expose `test:native-suite-pack` that chains the ten
satellite scripts, plus `test:mission-u` / `test:u11` pointing at the lock test.

## Requirement: Contract + assert needles

`docs/governance/CI_CD_CONTRACT.md` SHALL document Mission U / native-suite and
Ladder 11. `scripts/ci/assert-gha-contract.js` SHALL assert each satellite needle.
`assertGithubActionsContract` SHALL remain green.

## Requirement: Ladder 11 closeout honesty

`docs/releases/EOS_LADDER_11_CLOSEOUT_2026-09-11.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE, and
NON-CLAIM that CI pass ≠ production / ≠ GH enforcement upgrade.

## Requirement: Slim ceiling held

Mission U SHALL NOT raise TR-01. Satellite suites remain slim-excluded; the
lock test may stay in slim.
