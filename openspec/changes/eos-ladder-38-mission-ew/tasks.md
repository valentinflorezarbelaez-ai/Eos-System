# Tasks — Mission EW

- [x] Receipt module `credential-honesty-attestation-receipt.js` (`EW-RCPT-*`, pin `376378be`, `attestationDigest`, Law VI)
- [x] Policy gate `credential-honesty-attestation-policy-gate.js` (secret-field refuse + live-store / vault-KMS + L30–L37 / L38 gates)
- [x] Port `credential-honesty-attestation-port.js`
- [x] Hermetic tests EW1–EW17
- [x] Patcher `patch-mission-ew.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0140 + OpenSpec `eos-ladder-38-mission-ew`
- [ ] Host apply + `npm run test:mission-ew` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EW is SEPARATE next
