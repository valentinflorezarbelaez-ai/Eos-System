# Tasks — Mission DZ

- [x] Receipt module `process-manager-saga-receipt.js` (`DZ-RCPT-*`, pin `b382d29b`)
- [x] Policy gate `process-manager-saga-policy-gate.js`
- [x] Port `process-manager-saga-port.js`
- [x] Hermetic tests DZ1–DZ17
- [x] Patcher `patch-mission-dz.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0113 + OpenSpec `eos-ladder-34-mission-dz`
- [ ] Host apply + `npm run test:mission-dz` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-DZ is SEPARATE next
