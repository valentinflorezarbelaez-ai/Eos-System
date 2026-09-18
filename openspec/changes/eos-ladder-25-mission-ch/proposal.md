# Proposal — Mission CH Long-Horizon Mission Archive & Replay Port (SPEC-0091)

## Why

Ladder 25 axis **Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric** needs a Layer-0 sealed archive that replays multi-mission trails without claiming production data lake or SIEM retention SaaS. Session/continuity fragments exist; EOS lacks the archive/replay port (`CH-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/archive/`:
  - `mission-archive-replay-receipt.js` — sealed `CH-RCPT-*` receipts
  - `mission-archive-replay-policy-gate.js` — fail-closed archive/replay preconditions
  - `mission-archive-replay-port.js` — facade (`archive`, `replay`, `verifyTrail`, `getArchive`)
- Hermetic tests `tests/eos-ch-mission-archive-replay-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-ch.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0051, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Production data lake / persistent disk retention
- SIEM retention SaaS
- CI–CK implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L24

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L24 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L25 | OPEN (Audit + CG MEASURED · CH in progress · CI–CK pending) |
| Axis | Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 in-memory archive/replay (no disk lake / no SIEM) |
