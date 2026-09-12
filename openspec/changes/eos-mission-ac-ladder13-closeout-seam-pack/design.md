# Design — Mission AC (SPEC-0034)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12 V/W/X) …
  test:target-flight         # Z
  test:multi-agent-swarm     # AA
  test:telemetry-server      # AB
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:target-flight && …
  test:ladder13-pack = chain of 3
  test:mission-ac / test:ac13 = lock suite
  test:mission-z / test:mission-aa / test:mission-ab = aliases (seeded if missing)

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-ac-ladder13-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 13 satellite

CI_CD_CONTRACT.md
  Mission AC note + Ladder 13 note (careful append)
```

## Controls (AC1–AC8)

| ID | Control |
|----|---------|
| AC1 | ci.yml contains each Ladder 13 satellite + Fundacion + no soak/continue-on-error |
| AC2 | package scripts satellites + aliases + mission-ac + ac13 (+ native-suite / ladder13-pack) |
| AC3 | CI_CD_CONTRACT.md Ladder 13 / Mission AC |
| AC4 | Ladder 13 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE |
| AC5 | Mission AC release report |
| AC6 | OpenSpec SPEC-0034 artifacts |
| AC7 | lock slim-excluded |
| AC8 | Fundacion freeze kept; no continue-on-error |

## Slim

Lock test is **EXCLUDED** from slim (user/Mission AC policy for TR-01 ≤145).
Satellites remain slim-excluded; TR-01 not raised.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
Ladder 13 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
