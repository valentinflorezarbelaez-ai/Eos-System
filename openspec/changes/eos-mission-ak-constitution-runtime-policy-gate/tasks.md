# Tasks — Mission AK (SPEC-0042)

- [x] OpenSpec envelope eos-mission-ak-constitution-runtime-policy-gate (SPEC-0042)
- [x] Module src/core/policy/constitution-runtime-policy-gate.js
- [x] Thin helper src/core/policy/constitution-clause-allowlist.js
- [x] Suite tests/eos-ak-constitution-runtime-policy-gate.test.js (AK1–AK16 PASS; runtime synth secrets; rg-clean vendor-key prefix)
- [x] scripts/patch-mission-ak.mjs (test:constitution-runtime-policy-gate / test:mission-ak + slim exclude; CRLF-safe)
- [x] Release report with tip base 6a13307 / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AL–AM)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AK_BOOTSTRAP.ps1 on host
  - BLOCKED until host run: payload files + bootstrap ready on box; host bootstrap NOT run from this box
