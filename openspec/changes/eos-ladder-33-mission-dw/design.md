# Design — Mission DW Autonomous Idempotent Message Consumer Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — canonical 9-field seal → `DW-RCPT-*` + `consumeDigest`; soft-observe pin `b485ae0b`.
2. **Policy Gate** — fail-closed preconditions (message.messageId + non-empty payload + consumerId); refuse tip rewrite / PR flip / L30–L32 reopen / L33 auto-close / secrets / Fundacion / GHE / mass prune / hard delete.
3. **Port** — `govern()` consumes idempotently by `(consumerId, messageId)`, seals dedupe on same digest, rejects digest-mismatched replay, chains receipt trail; `softObserveDvOutbox()` / `softObserveDuPublisher()` soft-import when present.

## PASS definition

Idempotent consume/dedupe/replay sealed with verifiable `DW-RCPT-*` ≠ PRODUCTION_READY flip ≠ tip rewrite ≠ L33 auto-close.

## Soft-observe / soft-import

- Freeze pin soft-observe only — never rewrite `main_tip` / `evaluated_tip` / dirty-defer / m4 EXPECTED_TIP.
- Soft-import DV outbox receipt module when present; soft-fail when absent.
- Optionally soft-observe DU publisher when present; soft-fail when absent.
- Tests accept `observed === true | false` (DV15 host lesson — do NOT assert false only).
