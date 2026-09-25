# Spec — mission-dw-idempotent-message-consumer-port (SPEC-0133)

## Requirement

The system SHALL provide a Pure Layer-0 Autonomous Idempotent Message Consumer Port that:

1. Accepts a `message` (messageId + non-empty payload) and a `consumerId` for idempotency keying.
2. Consumes the message idempotently; re-delivery with the same payloadDigest SHALL dedupe (PASS + DEDUPLICATED).
3. Rejects digest-mismatched replay for the same idempotency key (DENY + REPLAY_REJECTED).
4. Emits cryptographically verifiable `DW-RCPT-*` receipts with `consumeDigest`.
5. Soft-observes freeze pin `b485ae0b` without rewriting tip pins.
6. Soft-imports DV outbox observe when present; optionally soft-observes DU publisher; composes DV outbox / DU domain-event fields on seal.
7. Refuses PRODUCTION_READY flip, tip rewrite, L30–L32 reopen, L33 auto-close, secrets, Fundacion writes, GHE claims, mass prune, and unsupervised hard delete.

## PASS

Idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close.
