# Tasks — Mission EZ

- [x] Receipt module `webhook-authenticity-receipt.js` (`EZ-RCPT-*`, pin `cc9161f9`, `authenticityDigest`, Law VI)
- [x] Policy gate `webhook-authenticity-policy-gate.js` (webhook/HMAC/secret-field refuse + L30–L38 / L39 gates)
- [x] Port `webhook-authenticity-port.js`
- [x] Hermetic tests EY1–EY17
- [x] Patcher `patch-mission-ez.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0144 + OpenSpec `eos-ladder-39-mission-ez`
- [ ] Host apply + `npm run test:mission-ez` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EZ is SEPARATE next
