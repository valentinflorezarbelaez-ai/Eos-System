# Tasks — Mission EL

- [x] Receipt module `resource-isolation-bulkhead-receipt.js` (`EL-RCPT-*`, pin `72697dd5`)
- [x] Policy gate `resource-isolation-bulkhead-policy-gate.js`
- [x] Port `resource-isolation-bulkhead-port.js`
- [x] Hermetic tests EL1–EL17
- [x] Patcher `patch-mission-el.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0127 + OpenSpec `eos-ladder-36-mission-el`
- [ ] Host apply + `npm run test:mission-el` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EL is SEPARATE next
