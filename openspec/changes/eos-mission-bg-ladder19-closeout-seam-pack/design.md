# Design — Mission BG (SPEC-0064)

## Architecture

```
ci.yml seam-pack
  … prior packs (incl. Ladder 12/13/14/15/16/17/18) …
  test:governed-patch-apply                # BC
  test:multi-target-delivery               # BD
  test:verification-replay                 # BE
  test:local-rc-packaging                  # BF
  Fundacion freeze (delta 0)

package.json
  test:native-suite-pack += && npm run test:governed-patch-apply && …
  test:ladder19-pack = chain of 4 + test:mission-bg
  test:mission-bg / test:bg19 / test:l19 = lock suite
  test:mission-bc / test:mission-bd / test:mission-be / test:mission-bf

scripts/test-runner.js
  SLIM_SUITE_EXCLUDES += eos-bg-ladder19-seam-pack.test.js

assert-gha-contract.js
  needles for each Ladder 19 satellite

CI_CD_CONTRACT.md (docs/governance preferred; docs/releases fallback)
  Mission BG note + Ladder 19 note (careful append; CRLF-safe)
```

No rewrite of BC/BD/BE/BF modules — compose via CI scripts only.

## Controls (BG1–BG18)

| ID | Control |
|----|---------|
| BG1 | ci.yml contains each Ladder 19 satellite + Fundacion + no soak/continue-on-error |
| BG2 | package scripts satellites + mission-bg + bg19 + l19 + mission aliases |
| BG3 | ladder19-pack chains BC+BD+BE+BF + mission-bg |
| BG4 | native-suite-pack extended with L19 (when present) |
| BG5 | primary lock paths + mission aliases aligned |
| BG6 | CI_CD_CONTRACT.md Ladder 19 / Mission BG + fragment |
| BG7 | Ladder 19 closeout NON-CLAIM / PRODUCTION_READY=NO / Fundacion Δ=0 / CLOSED_FOR_LOCAL_GOVERNED_USE / BC–BF+BG MEASURED / axis named |
| BG8 | Mission BG release report |
| BG9 | OpenSpec SPEC-0064 artifacts |
| BG10 | lock slim-excluded |
| BG11 | NON-CLAIM markers (GH Team/enforcement, PRODUCTION_READY, L19 satellite fences) |
| BG12 | Fundacion freeze kept; no continue-on-error; Law VI held (MODULE_DIR if present) |
| BG13 | patcher present + CRLF-safe |
| BG14 | assert-gha needles (when assert file present) |
| BG15 | Antigravity-first / CloudAgent out |
| BG16 | tip honesty deferred; Expected tip StartsWith 37a36e9 |
| BG17 | L17/L18 CLOSED never reopen; L19 CLOSED_FOR_LOCAL_GOVERNED_USE (never left OPEN) |
| BG18 | dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE + ADR-0022 rejected alts |

## Slim

Lock test is **EXCLUDED** from slim (TR-01 ≤145).
BC/BD/BE/BF satellites remain slim-excluded; TR-01 not raised.

## CRLF

Patcher line matchers use `[^\r\n]*` (Windows lesson from Mission AC / AH / AM / AR / BB), not `[^\n]*`.
Multi-line Set match uses `[\s\S]`.

## Honesty

PRODUCTION_READY=NO. Fundacion Δ=0. CI pass ≠ production. Local surrogate ≠ GH Team/Enterprise enforcement.
Ladder 19 CLOSED_FOR_LOCAL_GOVERNED_USE still means PRODUCTION_READY=NO.
Governed patch ≠ auto-merge SaaS; multi-target ≠ cloud fleet / K8s CD; replay ≠ SIEM; RC packaging ≠ GH Releases.
L17 CLOSED — never reopen. L18 CLOSED — never reopen. Never reopen L19 after closeout.
Tip honesty ritual deferred to post-BG tip refresh.
