# ADR-0051 — Mission CH Long-Horizon Mission Archive & Replay Port

- **Status:** Accepted — local governed (Ladder 25 Satellite 2)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric)
- **Spec:** SPEC-0091

## Context

Session/continuity fragments exist across missions. EOS lacked a Layer-0 sealed archive that replays multi-mission trails without claiming production ops, data-lake retention, or SIEM SaaS.

Mission CH delivers a pure Layer-0 Mission Archive & Replay Port that:
1. Accepts archive plans with archiveId + trailEntries[] { missionId, receiptId, digest }.
2. Validates plans fail-closed (empty trail, invalid archiveId/missionId/receiptId, digests not 64 hex, max entries, Law VI secrets, Fundacion).
3. Decides ARCHIVE | REPLAY | DENY and seals `CH-RCPT-*` receipts with trailDigest and optional replayCursor.
4. Verifies hash-chained custody via `verifyTrail()`.
5. Keeps trails hermetic in-memory only — no disk lake / no SIEM.

## Decision

1. Implement three Layer-0 modules under `src/core/archive/`:
   - `mission-archive-replay-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CH-RCPT-*`) via `node:crypto`.
   - `mission-archive-replay-policy-gate.js`: Fail-closed archive/replay validation.
   - `mission-archive-replay-port.js`: Unified port facade (`archive`, `replay`, `verifyTrail`, `getArchive`).
2. Valid archive plan → ARCHIVE with trailDigest; valid replay of sealed in-memory trail → REPLAY with replayCursor; gate reject → DENY.
3. Exclude satellite test suite `tests/eos-ch-mission-archive-replay-port.test.js` from default slim discovery; opt-in via `npm run test:mission-ch` / `test:mission-archive-replay`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ production data lake / ≠ SIEM retention SaaS.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on CG #346 tip `cbe1c525…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Production data lake / persistent disk retention
**Rejected.** Archive is hermetic in-memory only; ≠ production data lake.

### B. SIEM retention SaaS
**Rejected.** No SIEM export, retention policies, or SaaS claims.

### C. Writing into Fundacion trees during archive/replay
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant — archive must never bleed into Fundacion paths.

### D. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Ladder 25 CG tip until a SEPARATE tip-refresh after CH merges.

## Consequences

- **Positive:** Sealed multi-mission trail archive & replay with chained CH receipts; ~18 hermetic tests; zero secrets; Fundacion Δ=0; L25 axis continued without lake/SIEM claims.
- **Negative:** Archive is a local governed in-memory surface — not a production data lake or SIEM.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L24 never reopen.

## NON-CLAIMS

- Long-horizon mission archive & replay ≠ production data lake
- Long-horizon mission archive & replay ≠ SIEM retention SaaS
- Long-horizon mission archive & replay ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Mission CI
