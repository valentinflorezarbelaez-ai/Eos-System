# Tasks — Mission EQ

- [x] Receipt module `config-staged-activation-receipt.js` (`EQ-RCPT-*`, pin `748000c3`)
- [x] Policy gate `config-staged-activation-policy-gate.js`
- [x] Port `config-staged-activation-port.js`
- [x] Hermetic tests EQ1–EQ17
- [x] Patcher `patch-mission-eq.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0133 + OpenSpec `eos-ladder-37-mission-eq`
- [ ] Host apply + `npm run test:mission-eq` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EQ is SEPARATE next
