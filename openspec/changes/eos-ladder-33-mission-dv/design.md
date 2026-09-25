# Design — Mission DV Transactional Resilient Outbox Pattern Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — canonical 9-field seal → `DV-RCPT-*` + `outboxDigest`; soft-observe pin `cd1512a9`.
2. **Policy Gate** — fail-closed preconditions (domainEvent compose DU + outboxRecord.outboxId); refuse tip rewrite / PR flip / L30–L32 reopen / L33 auto-close / secrets / Fundacion / GHE / mass prune / hard delete.
3. **Port** — `govern()` persists idempotently by `outboxId`, seals at-least-once dispatch status, chains receipt trail; `softObserveDuPublisher()` soft-imports DU when present.

## PASS definition

Outbox persist/dispatch sealed with verifiable `DV-RCPT-*` ≠ PRODUCTION_READY flip ≠ tip rewrite.

## Soft-observe / soft-import

- Freeze pin soft-observe only — never rewrite `main_tip` / `evaluated_tip` / dirty-defer / m4 EXPECTED_TIP.
- Soft-import DU publisher receipt module when present; soft-fail when absent.
