# Tasks — Mission AG (SPEC-0038)

- [x] OpenSpec envelope eos-mission-ag-live-tool-engine (SPEC-0038)
- [x] Module src/core/tools/live-tool-engine.js (bus + native/mcp + Law VI + receipts)
- [x] Optional src/core/tools/tool-custody-receipt.js
- [x] Suite tests/eos-ag-live-tool-engine.test.js (AG1–AG16 PASS; runtime synth secrets)
- [x] scripts/patch-mission-ag.mjs (test:live-tool-engine / test:mission-ag + slim exclude)
- [x] Release report with tip base da18fde / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AH)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AG_BOOTSTRAP.ps1 on host
