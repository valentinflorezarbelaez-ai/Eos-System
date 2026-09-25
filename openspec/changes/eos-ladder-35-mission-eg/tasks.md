# Tasks — Mission EG

- [x] Receipt module `process-timeout-compensation-receipt.js` (`EG-RCPT-*`, pin `73252208`)
- [x] Policy gate `process-timeout-compensation-policy-gate.js`
- [x] Port `process-timeout-compensation-port.js`
- [x] Hermetic tests EG1–EG17
- [x] Patcher `patch-mission-eg.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0121 + OpenSpec `eos-ladder-35-mission-eg`
- [ ] Host apply + `npm run test:mission-eg` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EG is SEPARATE next
