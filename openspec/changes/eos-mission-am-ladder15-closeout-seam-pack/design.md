# Design — Mission AM (SPEC-0044)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12/13/14) …
  test:multi-session-autonomy              # AI
  test:evidence-economy-ledger             # AJ
  test:constitution-runtime-policy-gate    # AK
  test:autonomy-replay-forensic-observer   # AL
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:multi-session-autonomy && …
  test:ladder15-pack = chain of 4 + test:mission-am
  test:mission-am / test:am15 = lock suite
  test:mission-ai / test:mission-aj / test:mission-ak / test:mission-al

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-am-ladder15-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 15 satellite

CI_CD_CONTRACT.md
  Mission AM note + Ladder 15 note (careful append; CRLF-safe)
```

## Controls (AM1–AM14)

| ID | Control |
|----|---------|
| AM1 | ci.yml contains each Ladder 15 satellite + Fundacion + no soak/continue-on-error |
| AM2 | package scripts satellites + mission-am + am15 + mission aliases |
| AM3 | ladder15-pack chains AI+AJ+AK+AL + mission-am |
| AM4 | native-suite-pack extended with L15 (when present) |
| AM5 | primary lock paths + mission aliases aligned |
| AM6 | CI_CD_CONTRACT.md Ladder 15 / Mission AM |
| AM7 | Ladder 15 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE |
| AM8 | Mission AM release report |
| AM9 | OpenSpec SPEC-0044 artifacts |
| AM10 | lock slim-excluded |
| AM11 | NON-CLAIM markers (CI ≠ production / ≠ GH enforcement) |
| AM12 | Fundacion freeze kept; no continue-on-error; Law VI held |
| AM13 | patcher present + CRLF-safe |
| AM14 | assert-gha needles (when assert file present) |

## Slim

Lock test is **EXCLUDED** from slim (TR-01 ≤145).
AI/AJ/AK/AL satellites remain slim-excluded; TR-01 not raised.

## CRLF

Patcher line matchers use `[^\r\n]*` (Windows lesson from Mission AC / AH), not `[^\n]*`.
Multi-line Set match uses `[\s\S]`.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
Ladder 15 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
