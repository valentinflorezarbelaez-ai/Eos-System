# Design — Mission BH Lifecycle State Machine (SPEC-0065)

## FSM

```
PROPOSED ──► OPEN ──► MEASURED ──► CLOSED_FOR_LOCAL_GOVERNED_USE
                         ▲                    │
                         │                    ▼
              requires non-empty         TERMINAL
              evidenceHash               (cannot leave)
```

Allowed edges only:

| From | To | Extra precondition |
| --- | --- | --- |
| PROPOSED | OPEN | — |
| OPEN | MEASURED | non-empty `evidenceHash` |
| MEASURED | CLOSED_FOR_LOCAL_GOVERNED_USE | — |
| CLOSED_FOR_LOCAL_GOVERNED_USE | *(none)* | terminal |

Any other edge → `ILLEGAL_TRANSITION` DENY + sealed failure receipt.
Empty `missionId` → `EMPTY_MISSION_ID`. Malformed → `MALFORMED_PAYLOAD`.
Unknown state → `INVALID_STATE`. Fundacion → `FUNDACION_DENY`.

## TransitionReceipt schema

Canonical seal body (sha256 over `stableStringify`):

```
{
  receiptId,        // BH-RCPT-<12 hex>
  missionId,
  fromState,
  toState,
  evidenceHash,     // null when N/A
  timestamp,
  status,           // OK | DENY
  prevReceiptHash   // chain link (null on genesis)
}
```

`receiptHash` / `receiptDigest` = SHA-256 hex of that body via `node:crypto`.
Chain: each successful transition stores `prevReceiptHash` from prior receipt
(or last in-memory hash when omitted).

## Modules

| File | Role |
| --- | --- |
| `mission-transition-receipt.js` | `stableStringify`, `sha256Canonical`, `buildTransitionReceipt`, `verifyTransitionReceipt` |
| `mission-lifecycle-policy-gate.js` | `gateTransition`, DENY helpers, `BH_STATES`, `BH_ALLOWED_TRANSITIONS` |
| `mission-lifecycle-state-machine.js` | `createMissionLifecycleStateMachine({ now, hash })`, `transition`, `getHistory`, `health` |

Layer 0: ZERO external runtime deps except native `node:crypto`.
In-memory only — no network, no child_process, no real fs writes.

## Fail-closed

Invalid transitions never advance state. DENY always seals a receipt into
`getHistory(missionId)` when `missionId` is present.

## NON-CLAIM

FSM ≠ Jira/PM SaaS / ≠ distributed consensus/multi-region /
≠ PRODUCTION_READY=YES; not BI–BL; Fundacion Δ=0; Antigravity-first;
L17/L18/L19 never reopen.
