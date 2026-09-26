# Tasks — Mission FE

- [x] Receipt module `outbound-callback-authenticity-receipt.js` (`FE-RCPT-*`, pin `7b47bf8b`, `authenticityDigest`, Law VI)
- [x] Policy gate `outbound-callback-authenticity-policy-gate.js` (callback/HMAC/signing-key/secret-field refuse + L30–L39 / L40 gates)
- [x] Port `outbound-callback-authenticity-port.js`
- [x] Hermetic tests FE1–FE17
- [x] Patcher `patch-mission-fe.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0150 + OpenSpec `eos-ladder-40-mission-fe`
- [ ] Host apply + `npm run test:mission-fe` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FE is SEPARATE next
