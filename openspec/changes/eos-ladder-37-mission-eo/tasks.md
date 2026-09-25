# Tasks — Mission EO

- [x] Receipt module `feature-flag-runtime-toggle-receipt.js` (`EO-RCPT-*`, pin `f333afaf`)
- [x] Policy gate `feature-flag-runtime-toggle-policy-gate.js`
- [x] Port `feature-flag-runtime-toggle-port.js`
- [x] Hermetic tests EO1–EO17
- [x] Patcher `patch-mission-eo.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0131 + OpenSpec `eos-ladder-37-mission-eo`
- [ ] Host apply + `npm run test:mission-eo` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EO is SEPARATE next
