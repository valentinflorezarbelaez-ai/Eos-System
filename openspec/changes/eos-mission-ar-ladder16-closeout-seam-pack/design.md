# Design — Mission AR (SPEC-0049)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12/13/14/15) …
  test:multi-workstation-federation        # AN
  test:provider-failover-resilience        # AO
  test:hitl-po-authority                   # AP
  test:evidence-export-notarization        # AQ
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:multi-workstation-federation && …
  test:ladder16-pack = chain of 4 + test:mission-ar
  test:mission-ar / test:ar16 / test:l16 = lock suite
  test:mission-an / test:mission-ao / test:mission-ap / test:mission-aq

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-ar-ladder16-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 16 satellite

CI_CD_CONTRACT.md
  Mission AR note + Ladder 16 note (careful append; CRLF-safe)
```

## Controls (AR1–AR15)

| ID | Control |
|----|---------|
| AR1 | ci.yml contains each Ladder 16 satellite + Fundacion + no soak/continue-on-error |
| AR2 | package scripts satellites + mission-ar + ar16 + l16 + mission aliases |
| AR3 | ladder16-pack chains AN+AO+AP+AQ + mission-ar |
| AR4 | native-suite-pack extended with L16 (when present) |
| AR5 | primary lock paths + mission aliases aligned |
| AR6 | CI_CD_CONTRACT.md Ladder 16 / Mission AR |
| AR7 | Ladder 16 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE / AN–AQ MEASURED |
| AR8 | Mission AR release report |
| AR9 | OpenSpec SPEC-0049 artifacts |
| AR10 | lock slim-excluded |
| AR11 | NON-CLAIM markers (federation≠fleet, failover≠PR LLM, HITL≠GH enforcement, export≠compliance cert) |
| AR12 | Fundacion freeze kept; no continue-on-error; Law VI held |
| AR13 | patcher present + CRLF-safe |
| AR14 | assert-gha needles (when assert file present) |
| AR15 | Antigravity-first / CloudAgent out |

## Slim

Lock test is **EXCLUDED** from slim (TR-01 ≤145).
AN/AO/AP/AQ satellites remain slim-excluded; TR-01 not raised.

## CRLF

Patcher line matchers use `[^\r\n]*` (Windows lesson from Mission AC / AH / AM), not `[^\n]*`.
Multi-line Set match uses `[\s\S]`.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
Ladder 16 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
Federation ≠ fleet; failover ≠ PR LLM/SLA; HITL ≠ GH enforcement; export ≠ compliance cert.
Tip honesty ritual deferred to post-AR tip refresh.
