# Tasks — Mission FF

- [x] Receipt module `outbound-delivery-quarantine-retry-deny-receipt.js` (`FF-RCPT-*`, pin `1079bddf`, `quarantineDigest`/`retryDenyDigest`, Law VI)
- [x] Policy gate `outbound-delivery-quarantine-retry-deny-policy-gate.js` (callback/HMAC/secret/raw-payload refuse + L30–L39 / L39 gates)
- [x] Port `outbound-delivery-quarantine-retry-deny-port.js`
- [x] Hermetic tests FF1–FA17
- [x] Patcher `patch-mission-ff.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0151 + OpenSpec `eos-ladder-40-mission-ff`
- [ ] Host apply + `npm run test:mission-ff` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FF is SEPARATE next
