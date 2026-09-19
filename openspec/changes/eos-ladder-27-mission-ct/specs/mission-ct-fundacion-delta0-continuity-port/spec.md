# Spec — mission-ct-fundacion-delta0-continuity-port (SPEC-0103)

## Requirement: Fundacion Δ=0 Continuity Drill & Reconciliation Port

The system SHALL provide a Layer-0 Fundacion Δ=0 Continuity Drill & Reconciliation Port that:

1. Seals `CT-RCPT-*` receipts with nine canonical SHA-256 fields.
2. Fail-closes on empty/malformed plans, Fundacion targets/writes, Law VI secrets,
   PRODUCTION_READY flip claims, ALWAYS_DENY weakening, and L26 reopen claims.
3. Soft-imports `fundacion-delta0-gameday.js` when present; else uses injectable/builtin double.
4. Maps `continuityMode` ACTIVE|HOLD + gameday result → PASS|DENY|HOLD.
5. PASS only when Δ=0 is independently checked and reconciliation is ok.
6. Preserves FUNDACION_ALWAYS_DENY and human PRODUCTION_READY gate — refuse auto.
7. Emits PRODUCTION_READY=NO and Fundacion Δ=0 on every receipt.
8. NEVER claims Fundacion write auth, PRODUCTION_READY flip, weaken ALWAYS_DENY,
   L26 reopen, L27 closeout, tip-refresh, or CU.

## Requirement: Hermetic verification

The satellite test suite SHALL run under `node --test` with no network and
SHALL cover happy PASS, HOLD observe, refuse matrix (dirty/mismatch/pending/missing),
Fundacion write / weaken ALWAYS_DENY / L26 reopen refuse, PRODUCTION_READY flip refuse,
independent-check required, soft-import compose, and trail custody.
