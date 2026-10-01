# Tasks — Mission FJ

- [x] Receipt module `round-trip-request-reply-integrity-receipt.js` (`FJ-RCPT-*`, pin `78141c3d`, `integrityDigest`, Law VI)
- [x] Policy gate `round-trip-request-reply-integrity-policy-gate.js` (request/reply payload / secret-field refuse + L30–L40 / L41 gates)
- [x] Port `round-trip-request-reply-integrity-port.js`
- [x] Hermetic tests FJ1–FJ17
- [x] Patcher `patch-mission-fj.mjs` (CRLF-safe surgical; never overwrite authorize.js)
- [x] ADR-0156 + OpenSpec `eos-ladder-41-mission-fj`
- [ ] Host apply + `npm run test:mission-fj` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FJ is SEPARATE next
