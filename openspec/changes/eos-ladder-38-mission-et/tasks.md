# Tasks — Mission ET

- [x] Receipt module `credential-handle-registry-receipt.js` (`ET-RCPT-*`, pin `2b747fb0`, `handleDigest`, Law VI)
- [x] Policy gate `credential-handle-registry-policy-gate.js` (secret-field refuse + L30–L37 / L38 gates)
- [x] Port `credential-handle-registry-port.js`
- [x] Hermetic tests ET1–ET17
- [x] Patcher `patch-mission-et.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0137 + OpenSpec `eos-ladder-38-mission-et`
- [ ] Host apply + `npm run test:mission-et` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-ET is SEPARATE next
