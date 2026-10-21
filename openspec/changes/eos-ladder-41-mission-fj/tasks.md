# Tasks — Mission FJ

- [x] Receipt module `round-trip-request-reply-integrity-receipt.js` (`FJ-RCPT-*`, pin `8903b57`, `roundTripDigest`, Law VI)
- [x] Policy gate `round-trip-request-reply-integrity-policy-gate.js` (request/reply secret-field refuse + FI/FK elevate refuse + L30–L40 / L41 gates)
- [x] Port `round-trip-request-reply-integrity-port.js` (`govern`, `verifyTrail`)
- [x] Hermetic tests FJ1–FJ17 (17/17 pass)
- [x] ADR-0156 + OpenSpec `eos-ladder-41-mission-fj`
- [x] Host apply + `npm run test:mission-fj` + `verify:strict` (17/17 FJ tests; verify:strict 913/0)
- [x] PR + merge (#577) — freeze tip pins not rewritten by the product PR; tip-refresh post-FJ SEPARATE
- [x] Tip-refresh post-#577 (`038a9a4`) — pin catch-up only; L41 OPEN retained; FK–FM pending
