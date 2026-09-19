# Spec — mission-cs-specboot-continuity-port (SPEC-0102)

## Requirement: SpecBoot Operator Continuity Port

The system SHALL provide a Layer-0 SpecBoot Operator Continuity Port that:

1. Seals `CS-RCPT-*` receipts with nine canonical SHA-256 fields.
2. Fail-closes on empty/malformed plans, Fundacion targets, Law VI secrets,
   PRODUCTION_READY flip claims, and auto-seal claims.
3. Soft-imports `specboot-friction-gate.js` when present; else uses injectable/builtin double.
4. Maps `continuityMode` ACTIVE|HOLD + friction result → PASS|DENY|HOLD.
5. Preserves human gates A6 (seal) and A7 (PRODUCTION_READY) — refuse auto.
6. Emits PRODUCTION_READY=NO and Fundacion Δ=0 on every receipt.
7. NEVER claims automatic closure, PRODUCTION_READY flip, SpecBoot CLI rewrite,
   L26 reopen, or L27 closeout.

## Requirement: Hermetic verification

The satellite test suite SHALL run under `node --test` with no network and
SHALL cover happy PASS, HOLD observe, refuse matrix (dirty/stale/ownership/prereq),
A6 auto-seal refuse, A7 PRODUCTION_READY flip refuse, and trail custody.
