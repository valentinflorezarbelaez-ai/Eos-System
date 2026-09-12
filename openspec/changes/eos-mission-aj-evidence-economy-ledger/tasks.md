# Tasks — Mission AJ (SPEC-0041)

- [x] OpenSpec envelope eos-mission-aj-evidence-economy-ledger (SPEC-0041)
- [x] Module src/core/evidence/evidence-economy-ledger.js
- [x] Thin helper src/core/evidence/evidence-cost-tracker.js
- [x] Suite tests/eos-aj-evidence-economy-ledger.test.js (AJ1–AJ16 PASS; runtime synth secrets; rg-clean vendor-key prefix)
- [x] scripts/patch-mission-aj.mjs (test:evidence-economy-ledger / test:mission-aj + slim exclude; CRLF-safe)
- [x] Release report with tip base ccb25a9 / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AK–AM)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AJ_BOOTSTRAP.ps1 on host
  - BLOCKED until host run: payload files + bootstrap ready on box; host bootstrap NOT run from this box
