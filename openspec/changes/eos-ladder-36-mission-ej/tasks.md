# Tasks — Mission EJ

- [x] Receipt module `admission-control-intake-receipt.js` (`EJ-RCPT-*`, pin `d7490fee`)
- [x] Policy gate `admission-control-intake-policy-gate.js`
- [x] Port `admission-control-intake-port.js`
- [x] Hermetic tests EJ1–EJ17
- [x] Patcher `patch-mission-ej.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0125 + OpenSpec `eos-ladder-36-mission-ej`
- [ ] Host apply + `npm run test:mission-ej` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EJ is SEPARATE next
