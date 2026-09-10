# Proposal — EOS T4 Mission OS / EVD observe pack

## Why

Ladder 8 audit **T4 / K5**: Mission OS ATS↔loop coherence (M6) and EVD custody (G7/N2/P4) are COMPLETE locally, but there is no periodic **ritual observe** pack that exercises coherence + sealEvd + HUD freeze tip ALIGNED post-L7 without claiming production soak.

## What (this change only)

1. OpenSpec light folder (this proposal + tasks + .openspec.yaml)
2. `mission-os-evd-observe-pack` module: CI-safe ritual — assertCoherenceMapComplete + sealEvd (sandbox custody) + freeze tip ALIGNED (fixture MATCH) + EVD evidence record
3. CLI `scripts/ci/mission-os-evd-observe-pack.js` + package scripts `observe:mission-os-evd` / `test:t4`
4. TDD `tests/eos-t4-mission-os-evd-observe-pack.test.js`
5. Evidence release note + freeze T4 + matrix MEASURED; verify-eos REQUIRED_PATHS
6. NON-CLAIM: observe pack ≠ production soak; long-run ≠ soak-prod; PRODUCTION_READY=NO

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; T5+ PO prune; silent MCP prune; CloudAgent default; new schemas JSON; claim soak productivo
