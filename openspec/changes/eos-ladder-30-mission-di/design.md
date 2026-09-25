# Design — Mission DI: Post-Disposition Integrity & Docs SSOT Hold Ritual Port

## Architectural Overview

Mission DI acts as the verification and documentation SSOT checkpoint immediately following file disposition (Mission DH) and immediately preceding the final Ladder 30 seam closeout (Mission DJ).

```
[Mission DF: Inventory Remeasure] ➔ DF-RCPT-*
                │
                ▼
[Mission DG: PO L2 Named-Path Gate] ➔ DG-RCPT-*
                │
                ▼
[Mission DH: Quarantine Execution] ➔ DH-RCPT-*
                │
                ▼
[Mission DI: Integrity & Docs SSOT Hold] ➔ DI-RCPT-* ◄── (This Mission)
                │
                ▼
[Mission DJ: Ladder 30 Seam Closeout] ➔ L30 CLOSED
```

## Receipt Architecture (`post-disposition-integrity-hold-receipt.js`)

Canonical 9-field seal body:
```json
{
  "receiptId": "DI-RCPT-XXXX",
  "operation": "POST_DISPOSITION_INTEGRITY_HOLD",
  "planId": "plan-di-...",
  "decision": "PASS | DENY | HOLD",
  "changeId": "eos-ladder-30-mission-di",
  "integrityDigest": "sha256-hex",
  "timestamp": "ISO-8601",
  "fundacionDelta": 0,
  "prevReceiptHash": "sha256-hex"
}
```

Attached frozen properties:
- `productionReady`: `'NO'`
- `ritualMode`: `'ACTIVE' | 'HOLD' | 'DRY_RUN'`
- `dhReceiptLink`: `'DH-RCPT-...'`
- `freezeObserve`: `{ pin, pinShort, tipRewriteRefused, productionReadyFlipRefused, nonClaimLabels[] }` (pin `3d0c2e0b`)
- `ceilingHold`: `{ schemasAtCeiling: true, slimHold: true }`
- `docsSsotHold`: `{ docsConsistent: true, inventoryReflected: true }`
- `receiptHash`: SHA-256 seal digest

## Policy Gate Invariants (`post-disposition-integrity-hold-policy-gate.js`)

1. **Law VI Secrets**: Scan for API keys or credentials; fail-closed `DH_CODES.SECRET_LEAK_FORBIDDEN`.
2. **Fundacion Barrier**: Check target paths for `Fundacion`; fail-closed `DH_CODES.FUNDACION_DENIED`.
3. **Prior DH Receipt Link**: Require valid `DH-RCPT-*` linkage with `decision='PASS'`.
4. **Integrity Validation**: Require status `'VERIFIED'` and 0 failures from integrity checks.
5. **No PRODUCTION_READY Flip**: Reject claims or parameters asserting `PRODUCTION_READY='YES'`.
6. **No Tip-Pin Rewrite**: Reject any instruction to mutate or force-pin git tips.
7. **No L29 Reopen / No L30 Auto-Close**: Reject reopening L29 or auto-closing L30.
8. **No Auto-Seal without Human Gate**: Reject `autoSeal=true` unless human authority is satisfied.

## Port Interface (`post-disposition-integrity-hold-port.js`)

- `govern(plan)`: Runs policy checks, computes docs SSOT hash and integrity digest, seals `DI-RCPT-*`, records into trail.
- `verifyTrail()`: Validates cryptographic chaining and individual SHA-256 receipt integrity across all records in `this.trail`.
