# Tasks — Mission EC

- [x] Receipt module `domain-event-compatibility-receipt.js` (`EC-RCPT-*`, pin `19b353d8`)
- [x] Policy gate `domain-event-compatibility-policy-gate.js`
- [x] Port `domain-event-compatibility-port.js`
- [x] Hermetic tests EC1–EC17
- [x] Patcher `patch-mission-ec.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0116 + OpenSpec `eos-ladder-34-mission-ec`
- [ ] Host apply + `npm run test:mission-ec` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EC is SEPARATE next
