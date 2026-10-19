# Tasks — Mission FJ

- [x] Receipt module `round-trip-integrity-governance-receipt.js` (`FJ-RCPT-*`, pin `78141c3d`, `roundTripDigest`, Law VI)
- [x] Digest-only round-trip verifier (`verifyRoundTripIntegrity` — requestDigest === echoedRequestDigest)
- [x] Policy gate `round-trip-integrity-governance-policy-gate.js` (round-trip/secret-field refuse + L30–L41 gates + FI/FK/EY/FD/Canary elevate refusal)
- [x] Port `round-trip-integrity-governance-port.js` (`govern` + `verifyRoundTrip` + `verifyTrail`)
- [x] Hermetic tests FJ1–FJ20
- [x] ADR-0156 + OpenSpec `eos-ladder-41-mission-fj`
- [x] `package.json` scripts (`test:mission-fj`, `test:round-trip-integrity`, `test:ladder41-pack`) + slim-suite exclusion
- [x] `npm run test:mission-fj` + `verify:strict`
- [ ] PR + merge — do NOT rewrite freeze tip pins; tip-refresh post-FJ is SEPARATE next
