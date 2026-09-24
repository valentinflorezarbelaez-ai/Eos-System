# ADR-0101 — Mission DP Sovereign Vertical Slice & Screaming Architecture Port

- **Status:** Accepted — local governed (Ladder 32 Satellite 1)
- **Date:** 2026-09-24
- **Deciders:** EOS local governed use (Sovereign Screaming Architecture & Deterministic Agentic Execution Fabric)
- **Spec:** SPEC-0126
- **Prior ADRs:** ADR-0100 (Ladder 32 Audit), ADR-0099 (Mission DO L31 Closeout)

## Context

Following the formal chartering of Ladder 32 (ADR-0100), EOS requires structural enforcement within domain code:
1. Slices must scream business capability (Use Cases, Commands, Queries, Domain Rules) rather than passive, anemic technical folders.
2. Direct private imports across feature slices must be strictly forbidden; slices must interact only through public ports or domain events.
3. Layer-0 domain modules must maintain pure Node.js built-ins (`NODE_BUILTINS_ONLY`).

## Decision

1. **Implement Pure Layer-0 Triad (`src/core/composition/vertical-slice-*.js`)**:
   - `vertical-slice-receipt.js`: Canonical sealed 9-field `DP-RCPT-*` receipt generator with soft-observe pin `8bbdd522`.
   - `vertical-slice-policy-gate.js`: Policy gate with `evaluatePreconditions(plan)`, checking for cross-slice leakage, non-builtin imports, hard-delete flags, Law VI secrets, and Fundacion target paths (`FUNDACION_ALWAYS_DENY`).
   - `vertical-slice-port.js`: Pure Layer-0 port orchestrating the vertical slice governance ritual and maintaining a verifiable cryptographic trail.

2. **Implement Test Suite (`tests/eos-dp-vertical-slice-port.test.js`)**:
   - 17 hermetic tests (DP1–DP17) covering receipts, gates, and port behavior.
   - Registered in `package.json` as `test:mission-dp` and `test:vertical-slice`.
   - Excluded from slim runner via `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`.

3. **Invariants & Non-Claims**:
   - `PRODUCTION_READY = 'NO'`.
   - `Fundacion Δ=0`.
   - Law VI held (synthetic secret tokens in tests).
   - Schemas strictly held at `AT_CEILING 35/35`.
   - Ladders 17–31 permanently CLOSED — never reopen.

## Alternatives REJECTED

- Allowing cross-slice private imports without public ports — REJECTED: destroys screaming architecture cohesion.
- Permitting non-builtin dependencies in domain slices — REJECTED: violates Layer-0 purity (`DEPENDENCY_POLICY_L0.md`).
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: strict non-claim.

## Consequences

- Positive: Codebase architecture enforces clean vertical slices with screaming use cases.
- Invariants Preserved: All 914+ strict verification invariants hold cleanly.
