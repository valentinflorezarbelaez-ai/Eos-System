# Tasks — Mission FJ

- [x] Receipt module `round-trip-request-reply-integrity-receipt.js` (`FJ-RCPT-*`, pin `78141c3d`, `integrityDigest`, Law VI)
- [x] Policy gate `round-trip-request-reply-integrity-policy-gate.js` (reuse FI detectors; compose on FI PASS receipt)
- [x] Port `round-trip-request-reply-integrity-port.js`
- [x] Hermetic tests FJ1–FJ13
- [x] Patcher `patch-mission-fj.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0156 + OpenSpec `eos-ladder-41-mission-fj`
- [x] Host `npm run test:mission-fj` (13/13 PASS) + FI regression (17/17 PASS)
- [ ] PR — do NOT rewrite freeze tip pins; tip-refresh post-FJ is SEPARATE; do NOT claim L41 CLOSED
