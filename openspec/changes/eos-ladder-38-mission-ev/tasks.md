# Tasks — Mission EV

- [x] Receipt module `credential-handle-lifecycle-receipt.js` (`EV-RCPT-*`, pin `0eace5df`, `lifecycleDigest`, Law VI)
- [x] Policy gate `credential-handle-lifecycle-policy-gate.js` (secret-field refuse + live-mutation / vault-KMS + L30–L37 / L38 gates)
- [x] Port `credential-handle-lifecycle-port.js`
- [x] Hermetic tests EV1–EV17
- [x] Patcher `patch-mission-ev.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0139 + OpenSpec `eos-ladder-38-mission-ev`
- [ ] Host apply + `npm run test:mission-ev` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EV is SEPARATE next
