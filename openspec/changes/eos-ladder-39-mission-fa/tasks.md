# Tasks — Mission FA

- [x] Receipt module `ingress-quarantine-replay-deny-receipt.js` (`FA-RCPT-*`, pin `3cbb32dc`, `quarantineDigest`/`replayDenyDigest`, Law VI)
- [x] Policy gate `ingress-quarantine-replay-deny-policy-gate.js` (webhook/HMAC/secret/raw-payload refuse + L30–L38 / L39 gates)
- [x] Port `ingress-quarantine-replay-deny-port.js`
- [x] Hermetic tests FA1–FA17
- [x] Patcher `patch-mission-fa.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0145 + OpenSpec `eos-ladder-39-mission-fa`
- [ ] Host apply + `npm run test:mission-fa` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FA is SEPARATE next
