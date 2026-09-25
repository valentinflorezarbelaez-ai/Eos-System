# Design — Mission DU Domain Event Publisher Port

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`DU-RCPT-*`); freeze soft-observe `b205ce8c`; publishHold marks pure publish only / outbox deferred.
2. **Policy gate** — fail-closed preconditions; domainEvent must carry eventType + aggregateId + non-empty payload; refuse outbox / tip rewrite / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass prune / secrets / Fundacion.
3. **Port** — `govern` + `verifyTrail`; chains receipts; never flips PRODUCTION_READY.

## Non-claims

PASS ≠ outbox dispatch (DV later) ≠ PRODUCTION_READY. Soft-observe ≠ tip rewrite. Mission DU ≠ L33 closeout.
