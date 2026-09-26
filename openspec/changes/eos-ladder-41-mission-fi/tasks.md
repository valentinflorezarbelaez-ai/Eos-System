# Tasks — Mission FI

- [x] Receipt module `bidirectional-delivery-correlation-registry-receipt.js` (`FI-RCPT-*`, pin `78141c3d`, `correlationDigest`, Law VI)
- [x] Policy gate `bidirectional-delivery-correlation-registry-policy-gate.js` (correlation/secret-field refuse + L30–L40 / L41 gates)
- [x] Port `bidirectional-delivery-correlation-registry-port.js`
- [x] Hermetic tests FI1–FI17
- [x] Patcher `patch-mission-fi.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0155 + OpenSpec `eos-ladder-41-mission-fi`
- [ ] Host apply + `npm run test:mission-fi` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FI is SEPARATE next
