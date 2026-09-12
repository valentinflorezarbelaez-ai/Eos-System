# Design — Mission U (SPEC-0026)

## Architecture

```
ci.yml seam-pack
  … prior packs …
  test:compute-worker
  test:c2
  test:compute-worker-i|l|m|n|o
  test:loop-compute | worker-daemon | fdir-sentinel | specboot-agent | external-write-gateway
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack = chain of 10 satellites
  test:mission-u / test:u11 = lock suite

assert-gha-contract.js
  needles for each satellite (fail-closed contract)

CI_CD_CONTRACT.md
  seam-pack row + Mission U note + Ladder 11 note
```

## Controls (U1–U8)

| ID | Control |
|----|---------|
| U1 | ci.yml contains each native satellite + Fundacion + no soak/continue-on-error |
| U2 | package scripts native-suite-pack + mission-u + u11 |
| U3 | CI_CD_CONTRACT.md Mission U / Ladder 11 |
| U4 | Ladder 11 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 |
| U5 | assertGithubActionsContract ok |
| U6 | OpenSpec SPEC-0026 artifacts |
| U7 | Mission U release report |
| U8 | Fundacion freeze on all CI jobs; no continue-on-error |

## Slim

Lock test stays **IN** slim (like eos-u2-…). Satellites remain slim-excluded; TR-01 not raised.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
