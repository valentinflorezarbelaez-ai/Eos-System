# ADR-0050 — Mission CG External Tool / MCP Federation Port

- **Status:** Accepted — local governed (Ladder 25 Satellite 1)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric)
- **Spec:** SPEC-0090

## Context

Connectors exist ad hoc. EOS lacked a Layer-0 port that federates external tools / MCP surfaces with allowlists, sealed receipts (`CG-RCPT-*`), and Fundacion deny.

Mission CG delivers a pure Layer-0 External Tool Federation Port that:
1. Accepts federation plans with federationId + toolIds[] + allowlist[].
2. Validates plans fail-closed (empty plan/tools/allowlist, invalid federationId, invalid MCP-style tool ids, tools outside allowlist, unrestricted `*`, max tools, Law VI secrets, Fundacion).
3. Decides ALLOW | DENY and seals `CG-RCPT-*` receipts with toolCallDigest.
4. Verifies hash-chained custody via `verifyTrail()`.
5. Does not perform live MCP network calls; does not touch Fundacion trees.

## Decision

1. Implement three Layer-0 modules under `src/core/federation/`:
   - `external-tool-federation-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CG-RCPT-*`) via `node:crypto`.
   - `external-tool-federation-policy-gate.js`: Fail-closed federation validation.
   - `external-tool-federation-port.js`: Unified port facade (`federate`, `verifyTrail`, `getFederation`).
2. Valid plan (allowlist covers all requested tools) → ALLOW with toolCallDigest; gate reject → DENY.
3. Exclude satellite test suite `tests/eos-cg-external-tool-federation-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cg` / `test:external-tool-federation`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ unrestricted tool proxy / ≠ Fundacion writes.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on L25 Audit tip `868490a…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Unrestricted tool proxy / `*` allow-all
**Rejected.** Federation must remain allowlist-bound; `*` is always DENY.

### B. Writing into Fundacion trees during federation
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant — federation must never bleed into Fundacion paths.

### C. Live MCP network calls inside the port
**Rejected.** Hermetic Layer-0 port seals federation intent only; no live MCP I/O.

### D. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Ladder 25 Audit tip until a SEPARATE tip-refresh after CG merges.

## Consequences

- **Positive:** Allowlisted MCP/external-tool federation with chained CG receipts; 19 hermetic tests; zero secrets; Fundacion Δ=0; L25 axis started without proxy claims.
- **Negative:** Federation is a local governed allowlist surface — not an unrestricted tool proxy.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L24 never reopen.

## NON-CLAIMS

- External tool federation ≠ unrestricted tool proxy
- External tool federation ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CH
