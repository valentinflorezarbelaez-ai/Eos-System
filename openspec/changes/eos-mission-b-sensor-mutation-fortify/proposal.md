# Proposal — Mission B: Scoped Sensor Mutation Fortification

## Why

High-value false-positive risk remains on three governance sensors: a V5 custody identity can be spoofed with zero-width / format characters so `assertBuilderVerifierDisjunction` incorrectly PASSes; U7 must-not-invent and T8 NON-MUTATING gates need mutation-style oracles that prove FAIL-CLOSED when a core predicate is inverted or a bad fixture is injected.

Mission B is **scoped** — not a full 914-check mutation flip.

## What (this change)

1. OpenSpec change envelope `openspec/changes/eos-mission-b-sensor-mutation-fortify/`.
2. Mutation suite `tests/eos-mission-b-sensor-mutation-fortify.test.js` for **three** sensors:
   - **V5 builder-verifier-custody**: ZWSP/format spoof + inverted allow-all disjunction mutant → production FAIL-CLOSED.
   - **U7 specboot-defer-stubs must-not-invent**: temp fixture invents forbidden checklist path → audit FAIL-CLOSED; inverted mutant would PASS.
   - **T8 dirty-defer NON-MUTATING**: gate run leaves working tree untouched; ritual stripped of NON-MUTATING → FAIL-CLOSED.
3. Minimal Tier-2 fortification in `builder-verifier-custody.js` only where mutation proves a gap (normalize format/ZW chars before compare).
4. Wire `npm run test:mission-b` (no new deps).

## Definition of Done

- Branch `grok/mission-b-sensor-mutation-fortify` from origin/main (~2d58d51 / #103+).
- OpenSpec FIRST artifacts present.
- Mutation suite + `test:v5` / `test:u7` / `test:t8` green; `npm run verify:strict` EXIT 0 (914).
- Conventional commit without AI attribution; branch pushed; **no PR**.
- `PRODUCTION_READY=NO`; Fundacion Δ=0; AT_CEILING.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- Full 914 mutant campaign
- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- New JSON schemas (AT_CEILING)
- Opening or merging a PR
- Weakening V5/U7/T8 production invariants
