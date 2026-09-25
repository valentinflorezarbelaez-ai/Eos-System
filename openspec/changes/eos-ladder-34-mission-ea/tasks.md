# Tasks — Mission EA

- [x] Receipt module `cqrs-read-model-projection-receipt.js` (`EA-RCPT-*`, pin `1f2234cf`)
- [x] Policy gate `cqrs-read-model-projection-policy-gate.js`
- [x] Port `cqrs-read-model-projection-port.js`
- [x] Hermetic tests EA1–EA17
- [x] Patcher `patch-mission-ea.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0114 + OpenSpec `eos-ladder-34-mission-ea`
- [ ] Host apply + `npm run test:mission-ea` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EA is SEPARATE next