# Tasks — Mission EF

- [x] Receipt module `schedule-wake-deferred-receipt.js` (`EF-RCPT-*`, pin `0a286ad8`)
- [x] Policy gate `schedule-wake-deferred-policy-gate.js`
- [x] Port `schedule-wake-deferred-port.js`
- [x] Hermetic tests EF1–EF17
- [x] Patcher `patch-mission-ef.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0120 + OpenSpec `eos-ladder-35-mission-ef`
- [ ] Host apply + `npm run test:mission-ef` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EF is SEPARATE next
