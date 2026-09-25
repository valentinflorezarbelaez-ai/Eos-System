# Design — Mission DX Sovereign Circuit Breaker & Resilient Fallback Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — canonical 9-field seal → `DX-RCPT-*` + `breakerDigest`; soft-observe pin `d667c6b5`.
2. **Policy Gate** — fail-closed preconditions (breakerId + protectedOperation); refuse tip rewrite / PR flip / L30–L32 reopen / L33 auto-close / secrets / Fundacion / GHE / mass prune / hard delete.
3. **Port** — `govern()` runs CLOSED/OPEN/HALF_OPEN fail-closed state machine, seals resilient fallback on trip/OPEN, chains receipt trail; `softObserveDwConsumer()` / `softObserveDvOutbox()` / `softObserveDuPublisher()` soft-import when present.

## State machine

- **CLOSED** — allow primary; failures accumulate; trip to OPEN at `failureThreshold`.
- **OPEN** — deny primary; apply resilient fallback; after `cooldownMs` → HALF_OPEN.
- **HALF_OPEN** — probe; SUCCESS → CLOSED; FAILURE → OPEN (+ fallback).

## PASS definition

Circuit breaker + resilient fallback sealed with verifiable `DX-RCPT-*` ≠ PRODUCTION_READY flip ≠ tip rewrite ≠ L33 auto-close.

## Soft-observe / soft-import

- Freeze pin soft-observe only — never rewrite `main_tip` / `evaluated_tip` / dirty-defer / m4 EXPECTED_TIP.
- Soft-import DW consumer receipt module when present; soft-fail when absent.
- Optionally soft-observe DV outbox / DU publisher when present; soft-fail when absent.
- Tests accept `observed === true | false` (DV15/DW14 host lesson — do NOT assert false only).
