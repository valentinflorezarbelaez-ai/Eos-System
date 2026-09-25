# Tasks — Mission EH

- [x] Receipt module `temporal-honesty-attestation-receipt.js` (`EH-RCPT-*`, pin `ff4b6d19`)
- [x] Policy gate `temporal-honesty-attestation-policy-gate.js`
- [x] Port `temporal-honesty-attestation-port.js`
- [x] Hermetic tests EH1–EH17
- [x] Patcher `patch-mission-eh.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0122 + OpenSpec `eos-ladder-35-mission-eh`
- [ ] Host apply + `npm run test:mission-eh` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EH is SEPARATE next
