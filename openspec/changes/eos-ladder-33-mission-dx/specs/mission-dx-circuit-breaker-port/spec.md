# Spec — mission-dx-circuit-breaker-port (SPEC-0134)

## Requirement

The system SHALL provide a Pure Layer-0 Sovereign Circuit Breaker & Resilient Fallback Port that:

1. Accepts a `breakerId` and a `protectedOperation` for fail-closed boundary keying.
2. Maintains a CLOSED/OPEN/HALF_OPEN state machine; failures in CLOSED SHALL trip to OPEN at `failureThreshold`.
3. When OPEN, SHALL deny the primary path and seal a resilient fallback (`BREAKER_FALLBACK`).
4. After `cooldownMs` in OPEN, SHALL advance to HALF_OPEN; SUCCESS probe SHALL reset to CLOSED; FAILURE probe SHALL re-trip to OPEN.
5. Emits cryptographically verifiable `DX-RCPT-*` receipts with `breakerDigest`.
6. Soft-observes freeze pin `d667c6b5` without rewriting tip pins.
7. Soft-imports DW consumer observe when present; optionally soft-observes DV outbox / DU publisher; composes DW/DV/DU fields on seal.
8. Refuses PRODUCTION_READY flip, tip rewrite, L30–L32 reopen, L33 auto-close, secrets, Fundacion writes, GHE claims, mass prune, and unsupervised hard delete.

## PASS

Circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close.
