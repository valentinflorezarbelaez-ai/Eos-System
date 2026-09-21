# Spec — Mission CW Cross-Port Continuity Orchestration Port (SPEC-0106)

## Purpose

Operator-facing Layer-0 orchestration port composing CQ↔CR↔CS↔CT continuity observe (plus optional CU/CV observe) beyond CI seam-pack, without rewriting CU or reopening L27.

## Requirements

### Receipt

- SHALL seal `CW-RCPT-*` with nine canonical fields including `continuityDigest`
- SHALL set `productionReady=NO` and `fundacionDelta=0`
- SHALL chain via `prevReceiptHash`

### Policy gate

- SHALL require `planId` + `changeId` + `orchestrationMode` (ACTIVE|HOLD) + `phase`
- SHALL DENY missing required CQ↔CR↔CS↔CT observe labels without ack (ACTIVE)
- SHALL DENY Fundacion targets, secrets (Law VI), PRODUCTION_READY flip, L27 reopen, tip rewrite, CU rewrite, GHE claim, weaken ALWAYS_DENY, auto-seal

### Port

- SHALL expose `govern` / `evaluate` / `getDecision` / `verifyTrail`
- SHALL PASS when ACTIVE + required continuity set present + honesty ok
- SHALL HOLD when `orchestrationMode=HOLD` (observe; ≠ automatic L28 close)
- SHALL soft-import CV honesty when present; fixture otherwise
- SHALL NOT rewrite CU seam-pack / operator-doctor / operator-hud

## NON-CLAIMS

≠ GHE enforcement / ≠ CU rewrite / ≠ L27 reopen / ≠ PRODUCTION_READY / ≠ L28 closeout / ≠ tip rewrite / ≠ CX start
