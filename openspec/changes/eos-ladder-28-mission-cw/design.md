# Design — Mission CW Cross-Port Continuity Orchestration Port

## Port API

`CrossPortContinuityOrchestrationPort`: `govern` / `evaluate` / `getDecision` / `verifyTrail`

## Plan fields

- `planId`, `changeId`, `phase`, `orchestrationMode` (ACTIVE|HOLD)
- `observedPorts` — observe-only labels (CQ|CR|CS|CT|CU|CV)
- `continuityDigest` — optional sha256 hex
- Refuse flags: CU rewrite, GHE, Fundacion, secrets, PR flip, L27 reopen, tip rewrite, auto-seal

## Decision matrix

| Mode | Continuity set CQ↔CR↔CS↔CT | Result |
| --- | --- | --- |
| ACTIVE | present + honesty ok | PASS |
| HOLD | any (observe) | HOLD |
| ACTIVE | missing without ack / refuse claims | DENY |

## Soft-import

Prefer CV `hud-doctor-honesty-ritual-port.js` / `doctor-hud-honesty.js` when co-located; builtin continuity honesty double otherwise. Do not rewrite CU seam-pack.

## Receipts

Nine-field sealed `CW-RCPT-*` with `continuityDigest`, chained via `prevReceiptHash`.
