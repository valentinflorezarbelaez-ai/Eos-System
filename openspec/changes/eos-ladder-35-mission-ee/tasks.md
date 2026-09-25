# Tasks — Mission EE

- [x] Receipt module `temporal-deadline-ttl-receipt.js` (`EE-RCPT-*`, pin `9600063c`)
- [x] Policy gate `temporal-deadline-ttl-policy-gate.js`
- [x] Port `temporal-deadline-ttl-port.js`
- [x] Hermetic tests EE1–EE17
- [x] Patcher `patch-mission-ee.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0119 + OpenSpec `eos-ladder-35-mission-ee`
- [ ] Host apply + `npm run test:mission-ee` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EE is SEPARATE next
