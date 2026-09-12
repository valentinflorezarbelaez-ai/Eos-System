# Design — Mission AH (SPEC-0039)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12 V/W/X + Ladder 13 Z/AA/AB) …
  test:llm-provider-port      # AD
  test:token-budget-ecr       # AE
  test:autonomous-loop        # AF (alias)
  test:live-tool-engine       # AG
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:llm-provider-port && …
  test:ladder14-pack = chain of 4 + test:mission-ah
  test:mission-ah / test:ah14 = lock suite
  test:autonomous-execution-loop (kept) + test:autonomous-loop (alias)
  test:mission-ad / test:mission-ae / test:mission-af / test:mission-ag

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-ah-ladder14-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 14 satellite (incl. test:autonomous-loop)

CI_CD_CONTRACT.md
  Mission AH note + Ladder 14 note (careful append; CRLF-safe)
```

## Controls (AH1–AH8)

| ID | Control |
|----|---------|
| AH1 | ci.yml contains each Ladder 14 satellite + Fundacion + no soak/continue-on-error |
| AH2 | package scripts satellites + AF dual alias + mission-ah + ah14 + ladder14-pack |
| AH3 | CI_CD_CONTRACT.md Ladder 14 / Mission AH |
| AH4 | Ladder 14 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE |
| AH5 | Mission AH release report |
| AH6 | OpenSpec SPEC-0039 artifacts |
| AH7 | lock slim-excluded |
| AH8 | Fundacion freeze kept; no continue-on-error; Law VI held |

## Slim

Lock test is **EXCLUDED** from slim (TR-01 ≤145).
AD/AE/AF/AG satellites remain slim-excluded; TR-01 not raised.

## CRLF

Patcher line matchers use `[^\r\n]*` (Windows lesson from Mission AC), not `[^\n]*`.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
Ladder 14 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
