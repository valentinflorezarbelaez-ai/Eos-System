# Tasks — Mission FD

- [x] Receipt module `outbound-delivery-callback-registry-receipt.js` (`FD-RCPT-*`, pin `f9a14e16`, `deliveryDigest`, Law VI)
- [x] Policy gate `outbound-delivery-callback-registry-policy-gate.js` (webhook/HMAC/secret-field refuse + L30–L39 / L39 gates)
- [x] Port `outbound-delivery-callback-registry-port.js`
- [x] Hermetic tests FD1–FD17
- [x] Patcher `patch-mission-fd.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0149 + OpenSpec `eos-ladder-40-mission-fd`
- [ ] Host apply + `npm run test:mission-fd` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FD is SEPARATE next
