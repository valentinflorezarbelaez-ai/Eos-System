# Design — Mission CX Billing-Blocked Local Verify Ritual Port

## Port API

`BillingBlockedLocalVerifyRitualPort`: `govern` / `evaluate` / `getDecision` / `verifyTrail`

## Plan fields

- `planId`, `changeId`, `phase`, `ritualMode` (ACTIVE|HOLD)
- `observedPorts` — observe-only labels (CQ required; CR|CS|CT|CV|CW optional)
- `ritualDigest` — optional sha256 hex
- `ciEnvironment` — forced BILLING_BLOCKED / ACTIVE / NOT_RUN (refuse GH green)
- Refuse flags: GHA green, GHE, CQ rewrite, Fundacion, secrets, PR flip, L27 reopen, tip rewrite, auto-seal

## Decision matrix

| Mode | CQ observe + honesty | Result |
| --- | --- | --- |
| ACTIVE | present + honesty ok | PASS (≠ GHA green) |
| HOLD | any (observe) | HOLD (still BILLING_BLOCKED) |
| ACTIVE | missing CQ without ack / refuse claims | DENY |

## Soft-compose

Prefer CQ BILLING_BLOCKED observe labels + optional CR/CS/CT/CV/CW; soft-import CV/CW honesty when co-located; builtin local-verify honesty double otherwise. Do not rewrite CQ product.

## Receipts

Nine-field sealed `CX-RCPT-*` with `ritualDigest` + forced BILLING_BLOCKED `ciEnvironment`, chained via `prevReceiptHash`.
