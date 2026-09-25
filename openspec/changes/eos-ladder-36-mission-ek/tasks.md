# Tasks — Mission EK

- [x] Receipt module `backpressure-load-shed-receipt.js` (`EK-RCPT-*`, pin `5e5af281`)
- [x] Policy gate `backpressure-load-shed-policy-gate.js`
- [x] Port `backpressure-load-shed-port.js`
- [x] Hermetic tests EK1–EK17
- [x] Patcher `patch-mission-ek.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0126 + OpenSpec `eos-ladder-36-mission-ek`
- [ ] Host apply + `npm run test:mission-ek` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EK is SEPARATE next
