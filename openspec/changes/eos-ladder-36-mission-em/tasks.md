# Tasks — Mission EM

- [x] Receipt module `capacity-honesty-attestation-receipt.js` (`EM-RCPT-*`, pin `933f32ae`)
- [x] Policy gate `capacity-honesty-attestation-policy-gate.js`
- [x] Port `capacity-honesty-attestation-port.js`
- [x] Hermetic tests EM1–EM17
- [x] Patcher `patch-mission-em.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0128 + OpenSpec `eos-ladder-36-mission-em`
- [ ] Host apply + `npm run test:mission-em` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EM is SEPARATE next
