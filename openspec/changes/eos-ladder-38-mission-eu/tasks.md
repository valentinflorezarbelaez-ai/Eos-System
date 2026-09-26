# Tasks — Mission EU

- [x] Receipt module `secret-zero-leak-deny-receipt.js` (`EU-RCPT-*`, pin `bc24c17b`, `redactionDigest`, Law VI)
- [x] Policy gate `secret-zero-leak-deny-policy-gate.js` (secret-field refuse + L30–L37 / L38 gates)
- [x] Port `secret-zero-leak-deny-port.js`
- [x] Hermetic tests ET1–ET17
- [x] Patcher `patch-mission-eu.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0138 + OpenSpec `eos-ladder-38-mission-eu`
- [ ] Host apply + `npm run test:mission-eu` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EU is SEPARATE next
