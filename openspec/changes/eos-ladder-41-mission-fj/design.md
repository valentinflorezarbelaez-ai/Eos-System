# Design — Mission FJ Round-Trip Request-Reply Integrity Governance Port (SPEC-0172)

## Architecture
The Round-Trip Request-Reply Integrity Governance Port establishes a fail-closed composition seam in the Ladder 41 governance fabric.

### Canonical Receipt Seal Fields (Nine)
1. `receiptId`: Unique identifier (`FJ-RCPT-*`)
2. `operation`: `ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY`
3. `planId`: Execution plan ID
4. `decision`: `PASS` | `DENY` | `HOLD`
5. `changeId`: Change reference (`eos-ladder-41-mission-fj`)
6. `roundTripDigest`: Cryptographic sha256 hash of opaque request/reply correlation claims
7. `timestamp`: Isolated timestamp string
8. `fundacionDelta`: `0` (FUNDACION_ALWAYS_DENY)
9. `prevReceiptHash`: 64-char hex sha256 of prior receipt in chain

### Invariants
- `PRODUCTION_READY: NO`
- Pure Layer-0 Node.js (`node:crypto`)
- Zero plain secret leakage (Law VI)
- Soft-observe freeze pin: `78141c3d`
