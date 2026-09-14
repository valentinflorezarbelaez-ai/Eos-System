# Design — Mission BP: Sovereign Telemetry & Forensic Trail Aggregator

## Architectural Pattern
- **Layer:** Layer 0 (Pure Domain) under `src/core/telemetry/`.
- **Dependencies:** Built-in Node.js `node:crypto` only. Zero third-party packages.
- **Composition:** Aggregates outputs from BM (`agent-action-receipt.js`), BN (`sentinel-heartbeat-receipt.js`), BO (`two-key-consensus-receipt.js`), as well as L20 receipts without modifying them.

## Component Boundaries
1. `src/core/telemetry/sovereign-telemetry-receipt.js`:
   - Builds canonical aggregated telemetry receipt (`BP-RCPT-*`).
   - Computes SHA-256 over: `{ receiptId, batchIndex, entryCount, rootHash, timeRange, status, timestamp, prevReceiptHash }`.
2. `src/core/telemetry/forensic-trail-aggregator.js`:
   - `ingestReceipt(receipt)`: Validates receipt structure, checks hash validity, appends to in-memory chronological buffer.
   - `aggregateBatch()`: Computes chained cryptographic root hash, emits `BP-RCPT-*`.
   - `verifyAuditTrail(trail)`: Performs chronological verification, ensuring zero hash breaks or sequence gaps.
3. `src/core/telemetry/telemetry-policy-gate.js`:
   - Rejects unsealed receipts, invalid timestamps, or broken receipt chains (fail-closed).
