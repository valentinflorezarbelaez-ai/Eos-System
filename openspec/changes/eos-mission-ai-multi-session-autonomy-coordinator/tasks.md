# Tasks — Mission AI (SPEC-0040)

- [x] OpenSpec envelope eos-mission-ai-multi-session-autonomy-coordinator (SPEC-0040)
- [x] Module src/core/session/multi-session-autonomy-coordinator.js
- [x] Optional src/core/session/session-custody-store.js
- [x] Suite tests/eos-ai-multi-session-autonomy.test.js (AI1–AI16 PASS; runtime synth secrets)
- [x] scripts/patch-mission-ai.mjs (test:multi-session-autonomy / test:mission-ai + slim exclude)
- [x] Release report with tip base 99944f4 / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AJ–AM)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AI_BOOTSTRAP.ps1 on host
  - BLOCKED 2026-09-12: host Shell spawn powershell.exe ENOENT; payload files + bootstrap copied to Documents; box harness 16 PASS
