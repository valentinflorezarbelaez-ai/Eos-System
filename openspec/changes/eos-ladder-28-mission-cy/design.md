# Design — Mission CY Mission OS / Control-Plane L0 Residual Honesty Port

## Architecture

Three Layer-0 modules mirror CW/CX mold:

1. **Receipt** — nine-field canonical seal (`receiptId`, `operation`, `planId`, `decision`, `changeId`, `honestyDigest`, `timestamp`, `fundacionDelta=0`, `prevReceiptHash`) + attached freeze soft-observe + NON-CLAIM map. Receipt IDs `CY-RCPT-*`.
2. **Policy gate** — fail-closed plan validation; required observe set `{CV,CW,CX}`; refuse Fundacion / secrets / PR flip / tip-pin rewrite / L27 reopen / GHE / auto-close L28 / CZ start.
3. **Port** — `govern` → PASS|DENY|HOLD; soft-observe freeze NON-CLAIM fixtures; soft-import CV/CW/CX or builtin double; chained receipt trail.

## Freeze soft-observe

Pin forced to `487a38bfa6b174141171aa476e5b7b98cf4a0a4e` / short `487a38bf`. Overrides that mutate pin or set `readOnly=false` are refused. Labels encode NON-CLAIMs; never rewrite freeze SSOT files from this package.

## Decisions

| honestyMode | Observe | Decision |
| --- | --- | --- |
| ACTIVE | CV+CW+CX present + honesty ok | PASS |
| HOLD | (digest or empty ports) | HOLD |
| * | missing required / refuse claims | DENY |

## Invariants

PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; no schemas JSON; no tip-refresh; no CZ.
