# Tasks — Mission AF (SPEC-0037)

- [x] OpenSpec envelope eos-mission-af-autonomous-execution-loop (SPEC-0037)
- [x] Module src/core/loop/autonomous-execution-loop.js (inject ports + HITL + Fundacion DENY + Law VI)
- [x] Suite tests/eos-af-autonomous-execution-loop.test.js (AF1–AF16 PASS; inline fakes)
- [x] scripts/patch-mission-af.mjs (test:autonomous-execution-loop / test:mission-af + slim exclude)
- [x] Release report with tip base 4786826 / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AG/AH)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AF_BOOTSTRAP.ps1 on host
