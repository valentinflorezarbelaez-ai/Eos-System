# Spec — Mission CX Billing-Blocked Local Verify Ritual Port (SPEC-0107)

## Purpose

Operator-facing Layer-0 local verify ritual / runbook port composing CQ BILLING_BLOCKED observe (plus optional CR/CS/CT/CV/CW) with explicit honesty that local PASS ≠ GitHub Actions green ≠ GHE enforcement.

## Requirements

### Receipt

- SHALL seal `CX-RCPT-*` with nine canonical fields including `ritualDigest`
- SHALL force `ciEnvironment.github_actions=BILLING_BLOCKED` and `github_actions_verdict=NOT_RUN`
- SHALL set `productionReady=NO` and `fundacionDelta=0`
- SHALL chain via `prevReceiptHash`

### Policy gate

- SHALL require `planId` + `changeId` + `ritualMode` (ACTIVE|HOLD) + `phase`
- SHALL DENY missing required CQ observe labels without ack (ACTIVE)
- SHALL DENY GHA green claims, GHE claims, Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, L27 reopen, tip rewrite, CQ rewrite, weaken ALWAYS_DENY, auto-seal

### Port

- SHALL expose `govern` / `evaluate` / `getDecision` / `verifyTrail`
- SHALL PASS when ACTIVE + CQ observe present + honesty ok (still BILLING_BLOCKED)
- SHALL HOLD when `ritualMode=HOLD` (observe; ≠ automatic L28 close; ≠ GHA green)
- SHALL soft-compose CQ + optional CR/CS/CT/CV/CW labels; soft-import CV/CW honesty when present; fixture otherwise
- SHALL NOT rewrite CQ product
- SHALL encode explicit honesty: local PASS ≠ GHA green ≠ GHE

## NON-CLAIMS

≠ GHA green / ≠ GHE enforcement / ≠ CQ rewrite / ≠ L27 reopen / ≠ PRODUCTION_READY / ≠ L28 closeout / ≠ tip rewrite / ≠ CY start
