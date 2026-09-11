# Design — eos-mission-c2-ci-compute-worker (minimal)

## Pattern

Follow U2/T2 CI seam-pack locks: workflow step + assert-gha needle + contract note + small TDD lock. Do not invent a new test framework.

## Slim / TR-01

Default `npm test` discovery is already at 145. Dedicated C2 lock file is listed in `SLIM_SUITE_EXCLUDES` (same posture as Mission A fuzz/adversarial and Mission B). Coverage remains fail-closed via `npm run test:c2` and CI seam-pack.

## Fail-closed

No `continue-on-error`. Fundacion freeze step retained. `test:compute-worker` runs unit+fuzz+adversarial as already defined in package.json.
