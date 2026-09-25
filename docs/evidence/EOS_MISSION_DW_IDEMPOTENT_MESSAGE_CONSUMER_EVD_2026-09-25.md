# Evidence — Mission DW Autonomous Idempotent Message Consumer Port (SPEC-0133)

**Date:** 2026-09-25 (America/Bogota)
**Package:** `/workspace/eos-mission-dw/`
**ADR:** ADR-0109
**Soft-observe pin:** `b485ae0b2472ef8b6f7213fde82fc3ed05ead33d` (tip-refresh-post-447 / PR #447 Mission DV)

## Hermetic

```text
node --test tests/eos-dw-idempotent-message-consumer-port.test.js
# tests 17
# pass 17
# fail 0
```

## Seal fields exercised

- `DW-RCPT-*` nine-field canonical seal + `consumeDigest`
- `consumeHold.{consumeSealed,dedupeSealed,replayProtected}`
- `freezeObserve.pinShort=b485ae0b` + tipRewriteRefused + l33AutoCloseRefused
- `dvComposeObserve.softImport` (soft-fail when DV module absent; accept true|false)
- `duComposeObserve.softImport` (soft-fail when DU module absent; accept true|false)
- Compose DV `outboxRecord` + DU `domainEvent` on PASS receipt
- Idempotent re-consume → `DEDUPLICATED` + attempts increment
- Digest-mismatched replay → `REPLAY_REJECTED`

## NON-CLAIM

PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close ≠ L30/L31/L32 reopen ≠ Fundacion writes ≠ GHE ≠ mass prune ≠ unsupervised hard delete.
