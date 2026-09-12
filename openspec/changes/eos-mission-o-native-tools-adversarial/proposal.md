# Proposal — Mission O: Native-tools adversarial suite (SPEC-0020)

## Why

Missions I/L/M/N wired Gemini, Stitch, Browser QA, and multi-native compose into `executeComputeRun`. Operators still need proof that natives fail-closed under adversarial inputs: unknown lookalike tools, mid-compose infra throws, oversize/invalid args, mixed native+MCP plans without a dispatcher, compose-builder injection, custody seal on failure, dispatcher leakage on pure-native compose, and `serverName` spoof classification.

## What

1. OpenSpec change envelope `openspec/changes/eos-mission-o-native-tools-adversarial/`.
2. Suite `tests/runners/eos-compute-worker-mission-o-adversarial.test.js` (O1–O13 + optional live SKIP); basename in `SLIM_SUITE_EXCLUDES`; `npm run test:compute-worker-o`.
3. Worker patch **only if** a real fail-closed gap is proven. Expected: no worker delta (I/L/M/N already route + abort).
4. Release report `docs/releases/EOS_MISSION_O_NATIVE_TOOLS_ADVERSARIAL_2026-09-11.md`.

## DoD

Branch `grok/mission-o-native-tools-adversarial` from main@2d8f6d779523c1eee23e0b04178c3310ba4a026b; tests green (≥10 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- Live network in default suite
