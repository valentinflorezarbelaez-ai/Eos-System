# Spec — mission-dv-transactional-outbox-port (SPEC-0132)

## Requirement

The system SHALL provide a Pure Layer-0 Transactional Resilient Outbox Pattern Port that:

1. Accepts a `domainEvent` (compose DU: eventType + aggregateId + non-empty payload) and an `outboxRecord` with `outboxId`.
2. Persists the outbox record idempotently and seals at-least-once dispatch status.
3. Emits cryptographically verifiable `DV-RCPT-*` receipts with `outboxDigest`.
4. Soft-observes freeze pin `cd1512a9` without rewriting tip pins.
5. Soft-imports DU publisher observe when present.
6. Refuses PRODUCTION_READY flip, tip rewrite, L30–L32 reopen, L33 auto-close, secrets, Fundacion writes, GHE claims, mass prune, and unsupervised hard delete.

## PASS

Outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite.
