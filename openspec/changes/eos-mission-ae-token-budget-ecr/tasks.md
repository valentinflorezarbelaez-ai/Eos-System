# Tasks — Mission AE (SPEC-0036)

- [x] OpenSpec envelope eos-mission-ae-token-budget-ecr (SPEC-0036)
- [x] Module src/core/budget/token-budget-circuit-breaker.js (ECR + Law VI + filter)
- [x] Module src/core/budget/ecr-budget-gate.js (thin execution-loop seam)
- [x] Suite tests/eos-ae-token-budget-ecr.test.js (AE1–AE15 PASS)
- [x] scripts/patch-mission-ae.mjs (test:token-budget-ecr / test:mission-ae + slim exclude)
- [x] Release report with tip base 90e89da / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — payload copied to Documents; host Shell spawn powershell.exe ENOENT blocked agent run; run MISSION_AE_BOOTSTRAP.ps1 / .cmd on host
