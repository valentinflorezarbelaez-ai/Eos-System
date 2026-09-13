# Design — Mission BB (SPEC-0059)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12/13/14/15/16/17) …
  test:developer-engine-core               # AX
  test:ast-semantic-port                   # AY
  test:self-repair-bridge                  # AZ
  test:local-sandbox-port                  # BA
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:developer-engine-core && …
  test:ladder18-pack = chain of 4 + test:mission-bb
  test:mission-bb / test:bb18 / test:l18 = lock suite
  test:mission-ax / test:mission-ay / test:mission-az / test:mission-ba

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-bb-ladder18-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 18 satellite

CI_CD_CONTRACT.md (docs/governance preferred; docs/releases fallback)
  Mission BB note + Ladder 18 note (careful append; CRLF-safe)
```

## Controls (BB1–BB16)

| ID | Control |
|----|---------|
| BB1 | ci.yml contains each Ladder 18 satellite + Fundacion + no soak/continue-on-error |
| BB2 | package scripts satellites + mission-bb + bb18 + l18 + mission aliases |
| BB3 | ladder18-pack chains AX+AY+AZ+BA + mission-bb |
| BB4 | native-suite-pack extended with L18 (when present) |
| BB5 | primary lock paths + mission aliases aligned |
| BB6 | CI_CD_CONTRACT.md Ladder 18 / Mission BB |
| BB7 | Ladder 18 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE / AX–BA+BB MEASURED |
| BB8 | Mission BB release report |
| BB9 | OpenSpec SPEC-0059 artifacts |
| BB10 | lock slim-excluded |
| BB11 | NON-CLAIM markers (engine≠cloud IDE, AST≠PR LLM, repair≠unsupervised, sandbox≠K8s SaaS); L17 never reopen |
| BB12 | Fundacion freeze kept; no continue-on-error; Law VI held (MODULE_DIR if present) |
| BB13 | patcher present + CRLF-safe |
| BB14 | assert-gha needles (when assert file present) |
| BB15 | Antigravity-first / CloudAgent out |
| BB16 | tip honesty deferred; Expected tip StartsWith b206bf3 |

## Slim

Lock test is **EXCLUDED** from slim (TR-01 ≤145).
AX/AY/AZ/BA satellites remain slim-excluded; TR-01 not raised.

## CRLF

Patcher line matchers use `[^\r\n]*` (Windows lesson from Mission AC / AH / AM / AR), not `[^\n]*`.
Multi-line Set match uses `[\s\S]`.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH enforcement.
Ladder 18 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
Developer-engine ≠ cloud IDE; AST ≠ PR LLM/SLA; self-repair ≠ unsupervised prod; sandbox ≠ K8s SaaS.
L17 CLOSED — never reopen. Tip honesty ritual deferred to post-BB tip refresh.
