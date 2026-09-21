# Tasks — Mission DD Local CI Ritual Hardening Port (SPEC-0113)

- [x] Receipt module (`DD-RCPT-*`, freeze soft-observe 4d8c6c59)
- [x] Policy gate (fail-closed; DA+DB+DC observe required)
- [x] Port (`govern` / `evaluate` / `getDecision` / `verifyTrail`)
- [x] Soft-compose DA+DB+DC+DC observe; soft-observe L28 honesty
- [x] ~17 hermetic tests
- [x] CRLF-safe `patch-mission-dd.mjs`
- [x] ADR-0085 + evidence + release
- [x] OpenSpec `eos-ladder-29-mission-dd`
- [x] APPLY / RESULT / CODE_READY
- [ ] Host apply + PR (parent; no box git push)
