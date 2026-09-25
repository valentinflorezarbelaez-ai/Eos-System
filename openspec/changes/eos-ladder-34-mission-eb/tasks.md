# Tasks — Mission EB

- [x] Receipt module `dead-letter-quarantine-receipt.js` (`EB-RCPT-*`, pin `037f9578`)
- [x] Policy gate `dead-letter-quarantine-policy-gate.js`
- [x] Port `dead-letter-quarantine-port.js`
- [x] Hermetic tests EB1–EB17
- [x] Patcher `patch-mission-eb.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0115 + OpenSpec `eos-ladder-34-mission-eb`
- [ ] Host apply + `npm run test:mission-eb` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EB is SEPARATE next
