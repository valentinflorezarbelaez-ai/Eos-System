# Tasks — Mission FJ

- [x] Receipt module `round-trip-request-reply-integrity-receipt.js` (`FJ-RCPT-*`, pin `8903b57`, `roundTripDigest`, Law VI)
- [x] Policy gate `round-trip-request-reply-integrity-policy-gate.js` (request/reply secret-field refuse + FI/FK elevate refuse + L30–L40 / L41 gates)
- [x] Port `round-trip-request-reply-integrity-port.js` (`govern`, `verifyTrail`)
- [x] Hermetic tests FJ1–FJ17 (17/17 pass)
- [x] ADR-0156 + OpenSpec `eos-ladder-41-mission-fj`
- [ ] Host apply + `npm run test:mission-fj` + `verify:strict` (host gate)
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FJ is SEPARATE next
