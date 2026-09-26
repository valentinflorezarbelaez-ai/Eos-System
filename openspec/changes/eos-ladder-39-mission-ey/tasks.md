# Tasks — Mission EY

- [x] Receipt module `external-event-ingress-registry-receipt.js` (`EY-RCPT-*`, pin `987702da`, `ingressDigest`, Law VI)
- [x] Policy gate `external-event-ingress-registry-policy-gate.js` (webhook/HMAC/secret-field refuse + L30–L38 / L39 gates)
- [x] Port `external-event-ingress-registry-port.js`
- [x] Hermetic tests EY1–EY17
- [x] Patcher `patch-mission-ey.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0143 + OpenSpec `eos-ladder-39-mission-ey`
- [ ] Host apply + `npm run test:mission-ey` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-EY is SEPARATE next
