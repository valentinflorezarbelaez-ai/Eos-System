# Tasks — Mission AL (SPEC-0043)

- [x] OpenSpec envelope eos-mission-al-autonomy-replay-forensic-observer (SPEC-0043)
- [x] Module src/core/observability/autonomy-replay-forensic-observer.js
- [x] Thin helper src/core/observability/forensic-timeline-export.js
- [x] Suite tests/eos-al-autonomy-replay-forensic-observer.test.js (AL1–AL16 PASS; runtime synth secrets; rg-clean vendor-key prefix; no-mutation spies)
- [x] scripts/patch-mission-al.mjs (test:autonomy-replay-forensic-observer / test:mission-al + slim exclude; CRLF-safe)
- [x] Release report with tip base 8cf5538 / Δ=0 / NON-CLAIM
- [x] Box harness ≥12 PASS (hermetic; no CloudAgent; no Fundacion; no network; no AM)
- [ ] verify:strict + slim≤145 + push (host bootstrap) — run MISSION_AL_BOOTSTRAP.ps1 on host
  - BLOCKED until host run: payload files + bootstrap ready on box; host bootstrap NOT run from this box
