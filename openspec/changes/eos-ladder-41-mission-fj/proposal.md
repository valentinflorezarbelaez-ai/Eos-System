# Proposal — Mission FJ Round-Trip Request-Reply Integrity Governance Port (SPEC-0172)

## Why
Under Ladder 41 (*Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric*), Mission FI established the bidirectional delivery correlation registry. Mission FJ introduces the Round-Trip / Request-Reply Integrity Governance Port (`FJ-RCPT-*`) under SPEC-0172 / ADR-0156. This port provides fail-closed cryptographic verification of request-reply correlation, payload hash consistency, and latency SLAs across correlated opaque references (`L39` request ingress + `L40` reply outbound + `L41` FI correlation binding) without exposing raw secret payloads or violating Law VI.

## What
- Implement `RoundTripRequestReplyIntegrityReceipt` (`FJ-RCPT-*`) emitting 9 canonical seal fields + round-trip hold metadata.
- Implement `RoundTripRequestReplyIntegrityPolicyGate` enforcing fail-closed evaluation, Law VI zero secret leakage, request/reply digest matching, authorized binding check, and latency threshold bounds (`roundTripLatencyMs <= maxAllowedLatencyMs`).
- Implement `RoundTripRequestReplyIntegrityPort` governing request-reply integrity rituals and chaining cryptographically verifiable `FJ-RCPT-*` receipts.
- Maintain `PRODUCTION_READY = 'NO'` invariant and freeze soft-observe pin `78141c3d`.
- Comprehensive TDD unit tests in `tests/eos-fj-round-trip-request-reply-integrity.test.js`.

## Non-Claims
- `PRODUCTION_READY` flip refused (`NO`).
- Tip pin rewrite / tip-refresh refused.
- Reopening `L30` through `L40` refused.
- Auto-closing `L41` refused (FK–FM pending).
- Live HTTP egress and wall-clock authority refused.
- Raw payload / secret material logging refused (Law VI).
- Schema JSON additions refused (`AT_CEILING 35/35`).
