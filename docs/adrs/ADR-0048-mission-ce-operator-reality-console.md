# ADR-0048 — Mission CE Sovereign Operator Reality Console Port

- **Status:** Accepted — local governed (Ladder 24 Satellite 4)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric)
- **Spec:** SPEC-0088

## Context

HUD fragments exist. EOS lacked an aggregated epistemic console that surfaces MEASURED vs UNKNOWN vs BLOCKED across ladders for the operator (`CE-RCPT-*`).

Mission CE delivers a pure Layer-0 Operator Reality Console Port that:
1. Accepts snapshot plans with consoleId + entries[{ladder, satellite?, status, evidenceRef?}].
2. Validates plans fail-closed (empty console, invalid consoleId, invalid status enum, unknown ladder ids outside L11–L24, max entries, Law VI secrets, Fundacion).
3. Decides VIEW | DENY, aggregates summary counts, and seals `CE-RCPT-*` receipts.
4. Verifies hash-chained custody via `verifyTrail()`.
5. Does not call network/SIEM/APM APIs; does not touch Fundacion trees.

## Decision

1. Implement three Layer-0 modules under `src/core/observability/`:
   - `operator-reality-console-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CE-RCPT-*`) via `node:crypto`.
   - `operator-reality-console-policy-gate.js`: Fail-closed console validation.
   - `operator-reality-console-port.js`: Unified port facade (`snapshot`, `verifyTrail`, `getSnapshot`).
2. Valid plan → VIEW with aggregated MEASURED/UNKNOWN/BLOCKED summary; gate reject → DENY.
3. Exclude satellite test suite `tests/eos-ce-operator-reality-console-port.test.js` from default slim discovery; opt-in via `npm run test:mission-ce` / `test:operator-reality-console`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ full SIEM/APM / ≠ production ops center.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on CD tip `0652942…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Full SIEM/APM embedding
**Rejected.** EOS does not claim a production SIEM or APM stack.
Technical reason: Local Layer-0 hermetic epistemic aggregation with sealed digests is sufficient without network telemetry backends.

### B. Writing into Fundacion trees during console snapshot
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant — console must never bleed into Fundacion paths.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Mission CD tip until a SEPARATE tip-refresh after CE merges.

## Consequences

- **Positive:** Aggregated MEASURED/UNKNOWN/BLOCKED console with chained CE receipts; ≥15 hermetic tests; zero secrets; Fundacion Δ=0; operator fabric extended without SIEM claims.
- **Negative:** Console is a local governed epistemic surface — not a production ops center.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L23 never reopen.

## NON-CLAIMS

- Operator reality console ≠ full SIEM/APM
- Operator reality console ≠ production ops center
- Operator reality console ≠ Fundacion touch (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CF
