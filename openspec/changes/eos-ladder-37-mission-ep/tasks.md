# Tasks — Mission EP

- [x] Receipt module `policy-pack-binding-receipt.js` (`EP-RCPT-*`, pin `75131386`)
- [x] Policy gate `policy-pack-binding-policy-gate.js`
- [x] Port `policy-pack-binding-port.js`
- [x] Hermetic tests EP1–EP17
- [x] Patcher `patch-mission-ep.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0132 + OpenSpec `eos-ladder-37-mission-ep`
- [ ] Host apply + `npm run test:mission-ep` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EP is SEPARATE next
