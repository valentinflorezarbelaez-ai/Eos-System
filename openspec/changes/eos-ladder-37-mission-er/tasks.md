# Tasks — Mission ER

- [x] Receipt module `config-honesty-attestation-receipt.js` (`ER-RCPT-*`, pin `7ee4bd49`)
- [x] Policy gate `config-honesty-attestation-policy-gate.js`
- [x] Port `config-honesty-attestation-port.js`
- [x] Hermetic tests ER1–ER17
- [x] Patcher `patch-mission-er.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0134 + OpenSpec `eos-ladder-37-mission-er`
- [ ] Host apply + `npm run test:mission-er` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-ER is SEPARATE next
